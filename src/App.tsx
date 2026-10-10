import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, History, Settings as SettingsIcon, Plus } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import Settings from './pages/Settings';
import CameraFlow from './pages/CameraFlow';
import ManualEntry from './pages/ManualEntry';
import AuthPage from './pages/AuthPage';
import { AuthProvider, AuthLoading } from './auth/AuthContext';
import { useAuth } from './auth/context';
import OnboardingFlow from './onboarding/OnboardingFlow';
import { useOnboardingRecord } from './onboarding/storage';

function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        <Link to="/" className="flex flex-col items-center p-2 text-text-light hover:text-primary">
          <Home size={24} />
          <span className="text-xs mt-1">Today</span>
        </Link>
        <Link to="/history" className="flex flex-col items-center p-2 text-text-light hover:text-primary">
          <History size={24} />
          <span className="text-xs mt-1">History</span>
        </Link>
        
        <div className="relative -top-5">
          <Link to="/camera" className="flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark transition-colors">
            <Plus size={28} />
          </Link>
        </div>

        <Link to="/settings" className="flex flex-col items-center p-2 text-text-light hover:text-primary">
          <SettingsIcon size={24} />
          <span className="text-xs mt-1">Settings</span>
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<ProtectedShell />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Everything except /login requires a signed-in user; the main app also
// requires completed onboarding.
function ProtectedShell() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const record = useOnboardingRecord(user?.uid);

  // Session still restoring — wait rather than bouncing a signed-in user to /login.
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;

  const needsOnboarding = !record?.profile.onboardingCompleted;
  const onOnboarding = pathname.startsWith('/onboarding');
  const gate = needsOnboarding ? <Navigate to="/onboarding" replace /> : null;

  return (
    <div className={`min-h-screen bg-background font-sans text-text ${onOnboarding ? '' : 'pb-24'}`}>
      <Routes>
        <Route
          path="/onboarding"
          element={needsOnboarding ? <OnboardingFlow /> : <Navigate to="/" replace />}
        />
        <Route path="/" element={gate ?? <Dashboard />} />
        <Route path="/history" element={gate ?? <HistoryPage />} />
        <Route path="/settings" element={gate ?? <Settings />} />
        <Route path="/camera" element={gate ?? <CameraFlow />} />
        <Route path="/manual" element={gate ?? <ManualEntry />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!onOnboarding && <BottomNav />}
    </div>
  );
}

export default App;
