import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Users, PieChart, FileText, Settings } from 'lucide-react';
import { APP_VERSION, BUILD_NUMBER, RELEASE_CHANNEL, RELEASE_DATE, COPYRIGHT } from '../utils/version';

export const Layout: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div className="flex-grow">
            {(user?.status === 'suspended' || user?.subscription?.status === 'suspended' || user?.subscription?.status === 'expired') && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <p className="text-sm font-medium">
                    Your GymLedger subscription/account is currently <strong>{(user.status === 'suspended' || user.subscription?.status === 'suspended') ? 'SUSPENDED' : 'EXPIRED'}</strong>. Modifying operations are disabled. Please contact the platform admin to renew.
                  </p>
                </div>
                <a
                  href={`https://wa.me/917742111581?text=Hi%20Admin,%20I%27d%20like%20to%20renew%2520my%20subscription%20for%20my%20gym%20${encodeURIComponent(user.gymName || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 inline-flex items-center gap-1 cursor-pointer"
                >
                  Renew via WhatsApp
                </a>
              </div>
            )}
            <Outlet />
          </div>
          <footer className="mt-8 pt-4 border-t border-border/40 text-center text-xs footer-text flex flex-col items-center justify-center space-y-1">
            <p>{COPYRIGHT} SaaS Gym Management.</p>
            <p>
              Designed & Developed by{' '}
              <span className="text-[#F59E0B] font-semibold">Dipesh Jangir</span>
            </p>
            <button 
              onClick={() => setShowReleaseNotes(true)}
              className="text-[10px] opacity-75 mt-0.5 hover:underline hover:text-primary transition-all cursor-pointer focus:outline-none"
            >
              Version {APP_VERSION} • Build {BUILD_NUMBER} <br/>
              <span className="text-[9px] opacity-90 tracking-wide uppercase font-semibold">{RELEASE_CHANNEL}</span>
            </button>
          </footer>
        </main>
      </div>

      {showReleaseNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100">Release Notes</h3>
              <button 
                onClick={() => setShowReleaseNotes(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between items-center bg-[#1f2937]/50 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <div className="font-bold text-slate-100">Version {APP_VERSION}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Released: {RELEASE_DATE}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-primary">{RELEASE_CHANNEL}</span>
                  <span className="text-[9px] text-muted-foreground">Build {BUILD_NUMBER}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-200 uppercase text-[9px] tracking-wider">New Features</div>
                <ul className="space-y-1 pl-1 text-[11px] list-disc list-inside">
                  <li>Google Sign-In Authentication</li>
                  <li>Secure Google Account Linking</li>
                  <li>Google Registration Onboarding Flow</li>
                  <li>Super Admin Subscription Manager</li>
                </ul>
              </div>

              <div className="space-y-1.5 pt-1.5 border-t border-slate-850/60">
                <div className="font-bold text-slate-200 uppercase text-[9px] tracking-wider">Bug Fixes</div>
                <ul className="space-y-1 pl-1 text-[11px] list-disc list-inside">
                  <li>OAuth Origin Mismatch Resolved</li>
                  <li>Subscription Renewal Calculation Fix</li>
                  <li>Mobile Interface Layout Adjustments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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
