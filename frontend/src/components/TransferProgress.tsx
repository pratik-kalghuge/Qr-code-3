interface Props {
  progress: number;
  status: string;
  filename?: string | null;
  fileSize?: number | null;
}

export default function TransferProgress({ progress, status, filename, fileSize }: Props) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {filename && (
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span className="truncate max-w-xs">{filename}</span>
          {fileSize && <span>{formatSize(fileSize)}</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-center text-sm text-gray-500">{status}</div>
    </div>
  );
}
