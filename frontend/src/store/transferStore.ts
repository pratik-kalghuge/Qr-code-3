import { create } from 'zustand';

export type TransferStatus =
  | 'idle'
  | 'creating-session'
  | 'waiting-for-receiver'
  | 'connecting'
  | 'transferring'
  | 'complete'
  | 'error';

interface TransferStore {
  status: TransferStatus;
  progress: number;
  error: string | null;
  sessionId: string | null;
  filename: string | null;
  fileSize: number | null;
  setStatus: (status: TransferStatus) => void;
  setProgress: (progress: number) => void;
  setError: (error: string) => void;
  setSessionId: (id: string) => void;
  setFileInfo: (filename: string, size: number) => void;
  reset: () => void;
}

export const useTransferStore = create<TransferStore>((set) => ({
  status: 'idle',
  progress: 0,
  error: null,
  sessionId: null,
  filename: null,
  fileSize: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ status: 'error', error }),
  setSessionId: (sessionId) => set({ sessionId }),
  setFileInfo: (filename, fileSize) => set({ filename, fileSize }),
  reset: () => set({ status: 'idle', progress: 0, error: null, sessionId: null, filename: null, fileSize: null }),
}));
