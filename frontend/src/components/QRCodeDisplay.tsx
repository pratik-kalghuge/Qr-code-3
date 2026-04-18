import { QRCodeSVG } from 'qrcode.react';

interface Props {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 220 }: Props) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow">
      <QRCodeSVG value={value} size={size} />
      <p className="mt-3 text-xs text-gray-400 break-all max-w-xs text-center">{value}</p>
    </div>
  );
}
