import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, LogOut, User as UserIcon, Dumbbell } from 'lucide-react';

interface NavbarProps {
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Determine logo and name based on role / branding
  const displayName = user?.role === 'super_admin' 
    ? 'Super Admin Portal' 
    : (user?.branding?.gymName || user?.gymName || 'Iron Forge Gym');
  
  const logoUrl = user?.role === 'gym_owner' && user?.branding?.gymLogo 
    ? user.branding.gymLogo 
    : null;

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-card/85 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-muted md:hidden text-foreground"
          aria-label="Toggle Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Gym Logo" className="w-9 h-9 rounded-full object-cover border border-primary/20" />
          ) : (
            <div className="p-2 bg-gradient-to-tr from-primary to-secondary rounded-xl text-white">
              <Dumbbell className="w-5 h-5" />
            </div>
          )}
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
            {displayName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Info & Logout */}
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            {user?.role === 'super_admin' ? 'Platform Owner' : 'Gym Owner'}
          </span>
          <span className="text-xs text-muted-foreground">
            {user?.email}
          </span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 flex items-center gap-1 sm:gap-2 text-sm font-medium"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};
