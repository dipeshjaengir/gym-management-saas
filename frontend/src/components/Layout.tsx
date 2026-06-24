import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Users, PieChart, FileText, Settings } from 'lucide-react';

export const Layout: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-sm text-muted-foreground animate-pulse">Loading secure session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isTabActive = (paths: string[], exact = false) => {
    if (exact) return paths.includes(location.pathname);
    return paths.some(path => location.pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Gym Owners */}
      {user?.role === 'gym_owner' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex justify-around items-center h-16 md:hidden pb-safe shadow-lg">
          <button
            onClick={() => navigate('/app/members')}
            className="flex flex-col items-center justify-center flex-1 h-full cursor-pointer touch-manipulation focus:outline-none"
          >
            <div className={`px-5 py-1 rounded-full mb-0.5 transition-all ${isTabActive(['/app/members']) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-bold tracking-wide ${isTabActive(['/app/members']) ? 'text-primary' : 'text-muted-foreground'}`}>Members</span>
          </button>

          <button
            onClick={() => navigate('/app')}
            className="flex flex-col items-center justify-center flex-1 h-full cursor-pointer touch-manipulation focus:outline-none"
          >
            <div className={`px-5 py-1 rounded-full mb-0.5 transition-all ${(location.pathname === '/app' || location.pathname === '/app/') ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <PieChart className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-bold tracking-wide ${(location.pathname === '/app' || location.pathname === '/app/') ? 'text-primary' : 'text-muted-foreground'}`}>Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/app/payments')}
            className="flex flex-col items-center justify-center flex-1 h-full cursor-pointer touch-manipulation focus:outline-none"
          >
            <div className={`px-5 py-1 rounded-full mb-0.5 transition-all ${isTabActive(['/app/payments']) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-bold tracking-wide ${isTabActive(['/app/payments']) ? 'text-primary' : 'text-muted-foreground'}`}>Reports</span>
          </button>

          <button
            onClick={() => navigate('/app/branding')}
            className="flex flex-col items-center justify-center flex-1 h-full cursor-pointer touch-manipulation focus:outline-none"
          >
            <div className={`px-5 py-1 rounded-full mb-0.5 transition-all ${isTabActive(['/app/branding']) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-bold tracking-wide ${isTabActive(['/app/branding']) ? 'text-primary' : 'text-muted-foreground'}`}>Gym</span>
          </button>
        </nav>
      )}
    </div>
  );
};
