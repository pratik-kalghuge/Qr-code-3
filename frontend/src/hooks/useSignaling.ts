import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';

interface UseSignalingOptions {
  onSignal?: (signal: unknown) => void;
  onReceiverJoined?: () => void;
  onPeerDisconnected?: () => void;
  onJoined?: (data: { role: string; sessionId: string }) => void;
  onError?: (msg: string) => void;
}

export function useSignaling(options: UseSignalingOptions) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = io(SIGNALING_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('joined', (data) => optionsRef.current.onJoined?.(data));
    socket.on('signal', (signal) => optionsRef.current.onSignal?.(signal));
    socket.on('receiver-joined', () => optionsRef.current.onReceiverJoined?.());
    socket.on('peer-disconnected', () => optionsRef.current.onPeerDisconnected?.());
    socket.on('error', (msg: string) => optionsRef.current.onError?.(msg));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinAsSender = useCallback((sessionId: string) => {
    socketRef.current?.emit('join-as-sender', sessionId);
  }, []);

  const joinAsReceiver = useCallback((sessionId: string) => {
    socketRef.current?.emit('join-as-receiver', sessionId);
  }, []);

  const sendSignal = useCallback((sessionId: string, signal: unknown) => {
    socketRef.current?.emit('signal', { sessionId, signal });
  }, []);

  return { joinAsSender, joinAsReceiver, sendSignal };
}
