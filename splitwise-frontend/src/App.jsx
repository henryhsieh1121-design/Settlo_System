import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import useAppearanceStore from './store/useAppearanceStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupPage from './pages/GroupPage';
import SettlePage from './pages/SettlePage';
import JoinPage from './pages/JoinPage';
import ProfilePage from './pages/ProfilePage';

// PrivateRoute 必須在 BrowserRouter 內部才能使用 useLocation
function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return !token ? children : <Navigate to="/dashboard" replace />;
}

// 將外觀設定同步到 <html> data attributes
function AppearanceSync() {
  const { direction, mode } = useAppearanceStore();
  useEffect(() => {
    document.documentElement.setAttribute('data-dir', direction);
    document.documentElement.setAttribute('data-mode', mode);
  }, [direction, mode]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <AppearanceSync />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--text)',
            color: 'var(--bg)',
            borderRadius: '9999px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        <Route path="/dashboard"         element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/groups/:id"        element={<PrivateRoute><GroupPage /></PrivateRoute>} />
        <Route path="/groups/:id/settle" element={<PrivateRoute><SettlePage /></PrivateRoute>} />
        <Route path="/join"              element={<PrivateRoute><JoinPage /></PrivateRoute>} />
        <Route path="/profile"           element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
