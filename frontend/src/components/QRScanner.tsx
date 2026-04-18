import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!divRef.current) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (result) => {
        scanner.clear().catch(() => {});
        onScan(result);
      },
      (error) => {
        onError?.(error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onScan, onError]);

  return <div id="qr-reader" ref={divRef} className="w-full" />;
}
