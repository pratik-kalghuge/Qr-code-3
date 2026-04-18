import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import QRScanner from '../components/QRScanner';
import TransferProgress from '../components/TransferProgress';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import { sha256 } from '../utils/crypto';
import { saveFile } from '../utils/fileUtils';
import type { FileMetadata } from '../utils/fileUtils';

type Stage = 'scan' | 'connecting' | 'receiving' | 'complete' | 'error';

interface ChunkMessage {
  type: 'chunk';
  index: number;
}

export default function ReceiverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>('scan');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);

  const chunksRef = useRef<ArrayBuffer[]>([]);
  const metadataRef = useRef<FileMetadata | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const stageRef = useRef<Stage>('scan');

  // Keep stageRef in sync
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const handleData = useCallback(async (data: Uint8Array) => {
    const text = new TextDecoder().decode(data);

    // Check if it's a pure JSON control message
    if (text.startsWith('{')) {
      try {
        const msg = JSON.parse(text) as { type: string } & FileMetadata & { index: number };

        if (msg.type === 'metadata') {
          const meta: FileMetadata = {
            filename: msg.filename,
            size: msg.size,
            mimeType: msg.mimeType,
            totalChunks: msg.totalChunks,
            hash: msg.hash,
          };
          metadataRef.current = meta;
          setMetadata(meta);
          chunksRef.current = new Array(meta.totalChunks);
          setStage('receiving');
          return;
        }

        if (msg.type === 'complete') {
          const meta = metadataRef.current;
          if (!meta) return;

          // Assemble file
          const totalSize = chunksRef.current.reduce((acc, c) => acc + (c?.byteLength || 0), 0);
          const combined = new Uint8Array(totalSize);
          let offset = 0;
          for (const chunk of chunksRef.current) {
            if (chunk) {
              combined.set(new Uint8Array(chunk), offset);
              offset += chunk.byteLength;
            }
          }

          // Verify hash
          const receivedHash = await sha256(combined.buffer);
          if (receivedHash !== meta.hash) {
            setError('File integrity check failed. Transfer may be corrupted.');
            setStage('error');
            return;
          }

          saveFile(combined.buffer, meta.filename, meta.mimeType);
          setStage('complete');
          return;
        }
      } catch {
        // Not a simple JSON, might be chunk with header
      }
    }

    // Handle chunk with header\ndata format
    const newlineIdx = data.indexOf(10); // '\n'
    if (newlineIdx !== -1) {
      const headerBytes = data.slice(0, newlineIdx);
      const chunkData = data.slice(newlineIdx + 1);
      try {
        const header = JSON.parse(new TextDecoder().decode(headerBytes)) as ChunkMessage;
        if (header.type === 'chunk') {
          chunksRef.current[header.index] = chunkData.buffer.slice(
            chunkData.byteOffset,
            chunkData.byteOffset + chunkData.byteLength
          );
          const received = chunksRef.current.filter(Boolean).length;
          const total = metadataRef.current?.totalChunks || 1;
          setProgress(Math.round((received / total) * 100));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const webrtc = useWebRTC({
    initiator: false,
    onSignal: (signal) => {
      const sid = sessionIdRef.current;
      if (sid) sendSignal(sid, signal);
    },
    onData: handleData,
    onConnect: () => { setStage('receiving'); },
    onError: (err) => { setError(err.message); setStage('error'); },
    onClose: () => { if (stageRef.current !== 'complete') setError('Connection closed'); },
  });

  const { joinAsReceiver, sendSignal } = useSignaling({
    onSignal: (signal) => {
      webrtc.signal(signal as SimplePeer.SignalData);
    },
    onPeerDisconnected: () => { if (stageRef.current !== 'complete') setError('Sender disconnected'); },
    onJoined: () => {
      webrtc.createPeer();
    },
    onError: (msg) => { setError(msg); setStage('error'); },
  });

  const handleSessionId = useCallback((sid: string) => {
    setSessionId(sid);
    sessionIdRef.current = sid;
    setStage('connecting');
    joinAsReceiver(sid);
  }, [joinAsReceiver]);

  const handleScan = useCallback((result: string) => {
    try {
      const url = new URL(result);
      const sid = url.searchParams.get('sessionId');
      if (sid) {
        handleSessionId(sid);
      } else {
        setError('Invalid QR code');
      }
    } catch {
      setError('Invalid QR code');
    }
  }, [handleSessionId]);

  // Auto-join if sessionId in URL
  useEffect(() => {
    const sid = searchParams.get('sessionId');
    if (sid && stageRef.current === 'scan') {
      handleSessionId(sid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Receive File</h1>

        {stage === 'scan' && (
          <div>
            <p className="text-gray-600 mb-4 text-center">Scan the sender's QR code</p>
            <QRScanner onScan={handleScan} />
          </div>
        )}

        {stage === 'connecting' && (
          <div className="text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-gray-600">Connecting to sender...</p>
          </div>
        )}

        {stage === 'receiving' && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📥</div>
              <p className="text-gray-700 font-medium">Receiving file...</p>
            </div>
            <TransferProgress
              progress={progress}
              status={`${progress}% received`}
              filename={metadata?.filename}
              fileSize={metadata?.size}
            />
          </div>
        )}

        {stage === 'complete' && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Download Complete!</h2>
            <p className="text-gray-500 mb-6">{metadata?.filename} received and verified</p>
            <button
              onClick={() => { setStage('scan'); setMetadata(null); setProgress(0); setError(null); setSessionId(null); sessionIdRef.current = null; }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Receive Another
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{error || 'Something went wrong'}</p>
            <button
              onClick={() => { setStage('scan'); setError(null); setSessionId(null); sessionIdRef.current = null; }}
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
