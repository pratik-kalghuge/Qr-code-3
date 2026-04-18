import { useRef, useCallback } from 'react';
import SimplePeer from 'simple-peer';

interface UseWebRTCOptions {
  initiator: boolean;
  onSignal: (signal: SimplePeer.SignalData) => void;
  onData: (data: Uint8Array) => void;
  onConnect: () => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const createPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const peer = new SimplePeer({
      initiator: optionsRef.current.initiator,
      trickle: true,
    });

    peer.on('signal', (data) => optionsRef.current.onSignal(data));
    peer.on('data', (data: Uint8Array) => optionsRef.current.onData(data));
    peer.on('connect', () => optionsRef.current.onConnect());
    peer.on('error', (err) => optionsRef.current.onError(err));
    peer.on('close', () => optionsRef.current.onClose());

    peerRef.current = peer;
    return peer;
  }, []);

  const signal = useCallback((data: SimplePeer.SignalData) => {
    peerRef.current?.signal(data);
  }, []);

  const send = useCallback((data: ArrayBuffer | Uint8Array | string) => {
    if (peerRef.current && peerRef.current.connected) {
      peerRef.current.send(data as ArrayBuffer);
    }
  }, []);

  const destroy = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
  }, []);

  return { createPeer, signal, send, destroy };
}
