import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { useDarkMode } from '../hooks/useDarkMode';
import DarkModeToggle from '../components/DarkModeToggle';
import QRCode from 'qrcode';

type Stage = 'select' | 'preview' | 'uploading' | 'ready' | 'error';

const CLOUD_NAME = 'da3d7a1xg';
const UPLOAD_PRESET = 'pk_preset_name';

function getFileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return '🗜️';
  if (mime.startsWith('video/')) return '🎥';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.startsWith('text/')) return '📃';
  return '📁';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const d = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message: string } };
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error(d.error?.message || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`);
    xhr.send(fd);
  });
}

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function SenderPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const [stage, setStage] = useState<Stage>('select');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pin, setPin] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFileChosen = useCallback((f: File) => {
    setFile(f);
    setStage('preview');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileChosen(f);
  }, [handleFileChosen]);

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    setStage('uploading');
    setProgress(0);

    try {
      const fileUrl = await uploadWithProgress(file, setProgress);

      let receiveUrl =
        `${window.location.origin}/receive` +
        `?url=${encodeURIComponent(fileUrl)}` +
        `&name=${encodeURIComponent(file.name)}` +
        `&size=${file.size}`;

      if (pin.length === 4) {
        const ph = await hashPin(pin);
        receiveUrl += `&ph=${ph}`;
      }

      setQrUrl(receiveUrl);
      setStage('ready');
    } catch (e) {
      setError(String(e));
      setStage('error');
    }
  }, [file, pin]);

  const handleCopy = async () => {
    if (!qrUrl) return;
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!qrUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'File Share', url: qrUrl });
    } else {
      await handleCopy();
    }
  };

  const handleDownloadQR = async () => {
    if (!qrUrl) return;
    const dataUrl = await QRCode.toDataURL(qrUrl, { width: 512 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    a.click();
  };

  const reset = () => {
    setStage('select');
    setFile(null);
    setQrUrl(null);
    setError(null);
    setPreview(null);
    setProgress(0);
    setPin('');
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-900 dark:to-slate-800 transition-colors p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Send File</h1>
          <DarkModeToggle dark={dark} toggle={toggle} />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          {/* SELECT stage */}
          {stage === 'select' && (
            <div
              ref={dropRef}
              className="border-2 border-dashed border-indigo-300 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }}
              />
              <div className="text-5xl mb-3">📁</div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">Drop file here or click to browse</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Any file, up to 100 MB</p>
            </div>
          )}

          {/* PREVIEW stage */}
          {stage === 'preview' && file && (
            <div className="flex flex-col gap-4">
              {/* File info */}
              <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-slate-700 rounded-xl">
                <span className="text-4xl">{getFileIcon(file.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatSize(file.size)}</p>
                </div>
              </div>

              {/* Image preview */}
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900"
                />
              )}

              {/* PIN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Optional PIN (4 digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="Leave blank for no PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Change File
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                >
                  Generate QR
                </button>
              </div>
            </div>
          )}

          {/* UPLOADING stage */}
          {stage === 'uploading' && file && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4 animate-bounce">⬆️</div>
              <p className="text-slate-700 dark:text-slate-200 font-medium">Uploading...</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 truncate">{file.name}</p>
              <div className="mt-6 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold">{progress}%</p>
            </div>
          )}

          {/* READY stage */}
          {stage === 'ready' && qrUrl && file && (
            <div className="flex flex-col items-center gap-5">
              <div className="text-center">
                <div className="text-4xl mb-1">✅</div>
                <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg">Ready to share!</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm truncate max-w-xs">{file.name}</p>
              </div>

              <QRCodeDisplay value={qrUrl} />

              {/* PIN reminder */}
              {pin.length === 4 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
                  <span>🔒</span>
                  <span>Receiver needs PIN: <strong>{pin}</strong></span>
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="py-3 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
                <button
                  onClick={handleShare}
                  className="py-3 rounded-xl border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  📤 Share
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="col-span-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors text-sm"
                >
                  ⬇️ Download QR as PNG
                </button>
              </div>

              <button
                onClick={reset}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm underline"
              >
                Share Another File
              </button>
            </div>
          )}

          {/* ERROR stage */}
          {stage === 'error' && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={reset}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
