import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import FileSelector from '../components/FileSelector';
import QRCodeDisplay from '../components/QRCodeDisplay';
import TransferProgress from '../components/TransferProgress';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import { sha256 } from '../utils/crypto';
import { chunkFile } from '../utils/fileUtils';
import type { FileMetadata } from '../utils/fileUtils';

const API_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

type Stage = 'select' | 'waiting' | 'connecting' | 'transferring' | 'complete' | 'error';

export default function SenderPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('select');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const handleSignal = useCallback((signal: unknown) => {
    webrtc.signal(signal as SimplePeer.SignalData);
  }, []);

  const handleReceiverJoined = useCallback(() => {
    setStage('connecting');
    webrtc.createPeer();
  }, []);

  const handleConnect = useCallback(async () => {
    setStage('transferring');
    const f = fileRef.current;
    if (!f) return;

    try {
      // Read file and compute hash
      const buffer = await f.arrayBuffer();
      const hash = await sha256(buffer);
      const chunks = chunkFile(f);
      const metadata: FileMetadata = {
        filename: f.name,
        size: f.size,
        mimeType: f.type,
        totalChunks: chunks.length,
        hash,
      };

      // Send metadata
      webrtc.send(JSON.stringify({ type: 'metadata', ...metadata }));

      // Send chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunkBuffer = await chunks[i].arrayBuffer();
        const header = JSON.stringify({ type: 'chunk', index: i });
        const headerBytes = new TextEncoder().encode(header + '\n');
        const combined = new Uint8Array(headerBytes.length + chunkBuffer.byteLength);
        combined.set(headerBytes, 0);
        combined.set(new Uint8Array(chunkBuffer), headerBytes.length);
        webrtc.send(combined);

        // Small delay to avoid overwhelming buffer
        if (i % 10 === 0) {
          await new Promise((r) => setTimeout(r, 5));
        }

        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      }

      webrtc.send(JSON.stringify({ type: 'complete' }));
      setStage('complete');
    } catch (e) {
      setError(String(e));
      setStage('error');
    }
  }, []);

  const webrtc = useWebRTC({
    initiator: true,
    onSignal: (signal) => {
      const sid = sessionIdRef.current;
      if (sid) {
        sendSignal(sid, signal);
      }
    },
    onData: () => {},
    onConnect: handleConnect,
    onError: (err) => { setError(err.message); setStage('error'); },
    onClose: () => { setStage((s) => s !== 'complete' ? 'error' : s); },
  });

  const { joinAsSender, sendSignal } = useSignaling({
    onSignal: handleSignal,
    onReceiverJoined: handleReceiverJoined,
    onPeerDisconnected: () => { setStage((s) => { if (s !== 'complete') setError('Peer disconnected'); return s; }); },
    onError: (msg) => { setError(msg); setStage('error'); },
  });

  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    fileRef.current = f;
    setStage('waiting');

    try {
      const res = await fetch(`${API_URL}/api/session`, { method: 'POST' });
      const { sessionId: sid } = await res.json() as { sessionId: string };
      setSessionId(sid);
      sessionIdRef.current = sid;
      joinAsSender(sid);
    } catch {
      setError('Failed to create session');
      setStage('error');
    }
  }, [joinAsSender]);

  const qrUrl = sessionId
    ? `${window.location.origin}/receive?sessionId=${sessionId}`
    : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Send File</h1>

        {stage === 'select' && (
          <FileSelector onFileSelect={handleFileSelect} />
        )}

        {stage === 'waiting' && sessionId && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-600 text-center">
              Have the receiver scan this QR code
            </p>
            <QRCodeDisplay value={qrUrl} />
            <p className="text-sm text-gray-400 animate-pulse">Waiting for receiver...</p>
            {file && <p className="text-sm text-gray-500">File: {file.name}</p>}
          </div>
        )}

        {stage === 'connecting' && (
          <div className="text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-gray-600">Establishing P2P connection...</p>
          </div>
        )}

        {stage === 'transferring' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📤</div>
              <p className="text-gray-700 font-medium">Sending file...</p>
            </div>
            <TransferProgress
              progress={progress}
              status={`${progress}% complete`}
              filename={file?.name}
              fileSize={file?.size}
            />
          </div>
        )}

        {stage === 'complete' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Transfer Complete!</h2>
            <p className="text-gray-500 mb-6">{file?.name} sent successfully</p>
            <button
              onClick={() => { setStage('select'); setFile(null); setSessionId(null); sessionIdRef.current = null; setProgress(0); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Send Another
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{error || 'Something went wrong'}</p>
            <button
              onClick={() => { setStage('select'); setError(null); setSessionId(null); sessionIdRef.current = null; }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
