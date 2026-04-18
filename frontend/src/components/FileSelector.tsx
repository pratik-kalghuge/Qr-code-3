import { useRef } from 'react';

interface Props {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileSelector({ onFileSelect, accept = '*/*', maxSizeMB = 100 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    onFileSelect(file);
  };

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
      }}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <div className="text-4xl mb-3">📁</div>
      <p className="text-gray-600 font-medium">Drop file here or click to browse</p>
      <p className="text-gray-400 text-sm mt-1">Max {maxSizeMB}MB</p>
    </div>
  );
}
