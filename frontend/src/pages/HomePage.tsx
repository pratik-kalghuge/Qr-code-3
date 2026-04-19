import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';
import DarkModeToggle from '../components/DarkModeToggle';

export default function HomePage() {
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
      {/* Top bar */}
      <div className="flex justify-end p-4">
        <DarkModeToggle dark={dark} toggle={toggle} />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
            QR File Share
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
            Send any file instantly — just scan a QR code. No signup, no waiting.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {['No signup', 'Instant', 'Any device', 'Free'].map((label) => (
              <span
                key={label}
                className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Action cards */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/send')}
              className="flex-1 flex flex-col items-center gap-3 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-indigo-100 dark:border-slate-700 group"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">📤</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">Send File</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Upload &amp; get a shareable QR
              </span>
            </button>

            <button
              onClick={() => navigate('/receive')}
              className="flex-1 flex flex-col items-center gap-3 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all border border-violet-100 dark:border-slate-700 group"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform">📥</span>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">Receive File</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Open link from QR code
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
