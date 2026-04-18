import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type Stage = 'loading' | 'ready' | 'no-file';

export default function ReceiverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>('loading');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('file');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const url = searchParams.get('url');
    const name = searchParams.get('name');
    const size = searchParams.get('size');

    if (url) {
      setFileUrl(decodeURIComponent(url));
      setFilename(name ? decodeURIComponent(name) : 'file');
      setFileSize(size ? parseInt(size) : null);
      setStage('ready');
    } else {
      setStage('no-file');
    }
  }, [searchParams]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      // Fallback for iOS Safari — open directly
      window.open(fileUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Receive File</h1>

        {stage === 'loading' && (
          <div className="text-center text-gray-400">Loading...</div>
        )}

        {stage === 'ready' && fileUrl && (
          <div className="text-center">
            <div className="text-6xl mb-4">📥</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">File Ready</h2>
            <p className="text-gray-700 mb-1 break-all">{filename}</p>
            {fileSize !== null && (
              <p className="text-gray-400 text-sm mb-8">{formatSize(fileSize)}</p>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {downloading ? 'Downloading...' : 'Download File'}
            </button>
          </div>
        )}

        {stage === 'no-file' && (
          <div className="text-center">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-gray-600">No file link found.</p>
            <p className="text-gray-400 text-sm mt-2">Scan a QR code from the sender.</p>
          </div>
        )}
      </div>
    </div>
  );
}
