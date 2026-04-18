import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FileSelector from '../components/FileSelector';
import QRCodeDisplay from '../components/QRCodeDisplay';

type Stage = 'select' | 'uploading' | 'ready' | 'error';

const CLOUD_NAME = 'da3d7a1xg';
const UPLOAD_PRESET = 'pk_preset_name';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  );

  const data = await res.json() as { secure_url?: string; error?: { message: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Upload failed');
  }
  return data.secure_url;
}

export default function SenderPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('select');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setStage('uploading');

    try {
      const fileUrl = await uploadToCloudinary(f);

      const receiveUrl =
        `${window.location.origin}/receive` +
        `?url=${encodeURIComponent(fileUrl)}` +
        `&name=${encodeURIComponent(f.name)}` +
        `&size=${f.size}`;

      setQrUrl(receiveUrl);
      setStage('ready');
    } catch (e) {
      setError(String(e));
      setStage('error');
    }
  }, []);

  const reset = () => {
    setStage('select');
    setFile(null);
    setQrUrl(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Send File</h1>

        {stage === 'select' && <FileSelector onFileSelect={handleFileSelect} />}

        {stage === 'uploading' && (
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">⬆️</div>
            <p className="text-gray-700 font-medium">Uploading to cloud...</p>
            <p className="text-gray-400 text-sm mt-2">{file?.name}</p>
            <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full w-full animate-pulse" />
            </div>
          </div>
        )}

        {stage === 'ready' && qrUrl && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-700 font-medium">Ready to share!</p>
              <p className="text-gray-500 text-sm mt-1">{file?.name}</p>
            </div>
            <QRCodeDisplay value={qrUrl} />
            <p className="text-sm text-gray-400 text-center">
              Scan QR on any device — works on iPhone, Android, any browser
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Share Another File
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={reset} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
