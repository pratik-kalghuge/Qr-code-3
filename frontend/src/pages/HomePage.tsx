import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">P2P File Share</h1>
        <p className="text-gray-500 mb-10">Transfer files directly between devices. No server storage.</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/send')}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Send a File
          </button>
          <button
            onClick={() => navigate('/receive')}
            className="w-full py-4 px-6 bg-gray-200 text-gray-800 rounded-xl text-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Receive a File
          </button>
        </div>
        <p className="mt-8 text-sm text-gray-400">
          Powered by WebRTC · Files never touch our servers
        </p>
      </div>
    </div>
  );
}
