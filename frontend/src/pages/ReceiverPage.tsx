import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';
import DarkModeToggle from '../components/DarkModeToggle';

type Stage = 'loading' | 'pin' | 'ready' | 'no-file';

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
  const textExts = ['txt', 'csv', 'log', 'md'];
  if (imageExts.includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  if (videoExts.includes(ext)) return '🎥';
  if (audioExts.includes(ext)) return '🎵';
  if (textExts.includes(ext)) return '📃';
  return '📁';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ReceiverPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>('loading');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('file');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const url = searchParams.get('url');
    const name = searchParams.get('name');
    const size = searchParams.get('size');
    const ph = searchParams.get('ph');

    if (url) {
      setFileUrl(decodeURIComponent(url));
      setFilename(name ? decodeURIComponent(name) : 'file');
      setFileSize(size ? parseInt(size) : null);
      if (ph) {
        setPinHash(ph);
        setStage('pin');
      } else {
        setStage('ready');
      }
    } else {
      setStage('no-file');
    }
  }, [searchParams]);

  const handlePinSubmit = async () => {
    if (!pinHash) return;
    const computed = await hashPin(pinInput);
    if (computed === pinHash) {
      setPinError(false);
      setStage('ready');
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: 'File Share', url: currentUrl });
    } else {
      await navigator.clipboard.writeText(currentUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Receive File</h1>
          <DarkModeToggle dark={dark} toggle={toggle} />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          {stage === 'loading' && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">Loading...</div>
          )}

          {/* PIN stage */}
          {stage === 'pin' && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="text-5xl">🔒</div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">PIN Required</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  Enter the 4-digit PIN from the sender
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && pinInput.length === 4) handlePinSubmit(); }}
                className={`w-40 text-center text-2xl tracking-widest px-4 py-3 rounded-xl border ${
                  pinError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2`}
              />
              {pinError && (
                <p className="text-red-500 text-sm">Incorrect PIN. Try again.</p>
              )}
              <button
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 4}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                Unlock
              </button>
            </div>
          )}

          {/* READY stage */}
          {stage === 'ready' && fileUrl && (
            <div className="flex flex-col items-center gap-5">
              {/* File info */}
              <div className="w-full flex items-center gap-4 p-4 bg-indigo-50 dark:bg-slate-700 rounded-xl">
                <span className="text-5xl">{getFileIcon(filename)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{filename}</p>
                  {fileSize !== null && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatSize(fileSize)}</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-lg font-semibold rounded-xl transition-colors"
              >
                {downloading ? 'Downloading...' : '⬇️ Download File'}
              </button>

              <button
                onClick={handleShare}
                className="w-full py-3 border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-medium rounded-xl hover:bg-violet-50 dark:hover:bg-slate-700 transition-colors"
              >
                {shared ? '✓ Copied link!' : '📤 Share this link'}
              </button>
            </div>
          )}

          {stage === 'no-file' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">No file link found.</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                Scan a QR code from the sender to receive a file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
