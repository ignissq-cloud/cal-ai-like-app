import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, Clock, User } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import Settings from './pages/Settings';
import CameraFlow from './pages/CameraFlow';
import ManualEntry from './pages/ManualEntry';
import AuthPage from './pages/AuthPage';
import OnboardingAbout from './pages/OnboardingAbout';
import OnboardingMeasurements from './pages/OnboardingMeasurements';
import OnboardingReminders from './pages/OnboardingReminders';
import { AuthProvider, AuthLoading } from './auth/AuthContext';
import { useAuth } from './auth/context';

function BottomNav() {
  const { pathname } = useLocation();

  const isHome = pathname === '/' || pathname === '/login';
  const isHistory = pathname === '/history';
  const isProfile = pathname === '/settings';

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[340px] bg-white/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100/90 py-1.5 px-2 z-50 flex items-center justify-around">
      <Link
        to="/"
        className={`transition-all duration-200 flex flex-col items-center justify-center ${
          isHome
            ? 'bg-[#212121] text-white px-5 py-1.5 rounded-2xl shadow-sm'
            : 'text-gray-400 hover:text-gray-600 px-4 py-1.5'
        }`}
      >
        <Home size={18} className="stroke-[2.2]" />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
      </Link>

      <Link
        to="/history"
        className={`transition-all duration-200 flex flex-col items-center justify-center ${
          isHistory
            ? 'bg-[#212121] text-white px-5 py-1.5 rounded-2xl shadow-sm'
            : 'text-gray-400 hover:text-gray-600 px-4 py-1.5'
        }`}
      >
        <Clock size={19} className="stroke-[2.2]" />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">History</span>
      </Link>

      <Link
        to="/settings"
        className={`transition-all duration-200 flex flex-col items-center justify-center ${
          isProfile
            ? 'bg-[#212121] text-white px-5 py-1.5 rounded-2xl shadow-sm'
            : 'text-gray-400 hover:text-gray-600 px-4 py-1.5'
        }`}
      >
        <User size={19} className="stroke-[2.2]" />
        <span className="text-[10px] font-medium tracking-tight mt-0.5">Profile</span>
      </Link>
    </div>
  );
}

function MainAppShell() {
  const { loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <AuthLoading />;

  const isAuth = pathname === '/login' || pathname === '/auth' || pathname.startsWith('/onboarding');

  return (
    <div className={`min-h-screen bg-[#F8F9FA] font-sans text-gray-900 ${isAuth ? '' : 'pb-28'}`}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding/about" element={<OnboardingAbout />} />
        <Route path="/onboarding/measurements" element={<OnboardingMeasurements />} />
        <Route path="/onboarding/reminders" element={<OnboardingReminders />} />
        <Route path="/onboarding" element={<Navigate to="/onboarding/about" replace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/camera" element={<CameraFlow />} />
        <Route path="/manual" element={<ManualEntry />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAuth && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
