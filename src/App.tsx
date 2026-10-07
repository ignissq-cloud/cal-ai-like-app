import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, History, Settings as SettingsIcon, Plus } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import Settings from './pages/Settings';
import CameraFlow from './pages/CameraFlow';
import ManualEntry from './pages/ManualEntry';

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
      <div className="min-h-screen bg-background pb-24 font-sans text-text">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/camera" element={<CameraFlow />} />
          <Route path="/manual" element={<ManualEntry />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
