import { useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import SenderPage from './pages/SenderPage';
import ReceiverPage from './pages/ReceiverPage';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<AutoRoute />} />
        <Route path="/send" element={<SenderPage />} />
        <Route path="/receive" element={<ReceiverPage />} />
      </Routes>
    </div>
  );
}

function AutoRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    const role = searchParams.get('role');
    if (sessionId && role === 'receiver') {
      navigate(`/receive?sessionId=${sessionId}`);
    }
  }, [searchParams, navigate]);

  return <HomePage />;
}
