import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../services/api';
import {
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Bell,
  Search,
  Check,
  X,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  Calendar,
  Users,
  Ticket,
  FileText,
  Trash2
} from 'lucide-react';
import { Logo } from './Logo';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const endpoint = user?.role === 'super_admin' ? '/superadmin/search' : '/gymowner/search';
        const data = await api.get(`${endpoint}?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(data);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, user?.role]);

  // Fetch Notifications
  const fetchNotifications = async () => {
    if (user?.role !== 'gym_owner') return;
    try {
      const data = await api.get('/notifications/center');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/center/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
  };

  const handleDismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/center/${id}/dismiss`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast('Notification dismissed', 'success');
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
      showToast('Failed to dismiss notification', 'error');
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.put('/notifications/center/dismiss-all');
      setNotifications([]);
      showToast('All notifications dismissed', 'success');
      setShowNotifications(false);
    } catch (err) {
      console.error('Failed to dismiss all notifications:', err);
      showToast('Failed to dismiss all notifications', 'error');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const displayName = user?.role === 'super_admin'
    ? 'Super Admin Portal'
    : (user?.branding?.gymName || user?.gymName || 'GymLedger Gym');

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
            <Logo size={36} />
          )}
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground hidden sm:inline">
            {displayName}
          </span>
        </div>
      </div>

      {/* Global Unified Search Bar */}
      <div ref={searchRef} className="flex-1 max-w-md mx-4 relative hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={user?.role === 'super_admin' ? 'Search Owners, Leads, Coupons...' : 'Search Members, Payments, Plans...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border/80 focus:border-primary focus:bg-background rounded-xl text-sm focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (searchQuery.trim() !== '') && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl max-h-96 overflow-y-auto z-50 p-2 animate-slide-in">
            {searchLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-2" />
                Searching records...
              </div>
            ) : !searchResults || (
              Object.keys(searchResults).every(k => !Array.isArray(searchResults[k]) || searchResults[k].length === 0)
            ) ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No matches found for "{searchQuery}"</div>
            ) : (
              <div className="space-y-3">
                {/* Gym Owner Search Sections */}
                {searchResults.members && searchResults.members.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <Users className="w-3.5 h-3.5" /> Members
                    </div>
                    {searchResults.members.map((m: any) => (
                      <Link
                        key={m._id}
                        to={`/app/members/${m._id}`}
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.phone} | {m.paymentStatus.toUpperCase()}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.payments && searchResults.payments.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <CreditCard className="w-3.5 h-3.5" /> Payments
                    </div>
                    {searchResults.payments.map((p: any) => (
                      <Link
                        key={p._id}
                        to="/app/payments"
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">Receipt: {p.receiptNumber}</div>
                          <div className="text-xs text-muted-foreground">₹{p.amount} collected for {p.memberId?.name || 'Member'}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.plans && searchResults.plans.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Platform/Membership Plans
                    </div>
                    {searchResults.plans.map((pl: any) => (
                      <Link
                        key={pl._id}
                        to={user?.role === 'super_admin' ? '/app/subscription' : '/app/plans'}
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{pl.name}</div>
                          <div className="text-xs text-muted-foreground">₹{pl.price} | {pl.durationMonths} Month(s)</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.attendance && searchResults.attendance.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> Attendance Logs
                    </div>
                    {searchResults.attendance.map((a: any) => (
                      <Link
                        key={a._id}
                        to="/app/attendance-history"
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{a.memberId?.name} - {a.status.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground">{a.date} | In: {a.checkInTime} {a.checkOutTime ? `Out: ${a.checkOutTime}` : ''}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Super Admin Search Sections */}
                {searchResults.owners && searchResults.owners.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <Users className="w-3.5 h-3.5" /> Gym Owners
                    </div>
                    {searchResults.owners.map((o: any) => (
                      <Link
                        key={o._id}
                        to="/app/owners"
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{o.gymName}</div>
                          <div className="text-xs text-muted-foreground">Owner: {o.ownerName} | {o.status}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.leads && searchResults.leads.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Leads
                    </div>
                    {searchResults.leads.map((l: any) => (
                      <Link
                        key={l._id}
                        to="/app/leads"
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{l.name}</div>
                          <div className="text-xs text-muted-foreground">{l.phone} | {l.city} | Plan: {l.interestedPlan}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.coupons && searchResults.coupons.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 border-b border-border/40 pb-1 mb-1">
                      <Ticket className="w-3.5 h-3.5" /> Coupons
                    </div>
                    {searchResults.coupons.map((c: any) => (
                      <Link
                        key={c._id}
                        to="/app/coupons"
                        onClick={() => setShowSearchResults(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/70 text-sm transition-all"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{c.code}</div>
                          <div className="text-xs text-muted-foreground">{c.discountType.toUpperCase()}: {c.discountValue}% | Uses: {c.timesUsed}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* In-app Notification Bell (Gym Owners only) */}
        {user?.role === 'gym_owner' && (
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-extrabold text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-slide-in">
                <div className="px-4 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-primary" /> Notifications Center
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleDismissAll}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Dismiss All
                    </button>
                  )}
                </div>

                <div className="max-h-[350px] overflow-y-auto divide-y divide-border/40">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No new notification alerts.
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      // Map icon based on category
                      let icon = <Bell className="w-4 h-4 text-indigo-400" />;
                      if (notif.category === 'registration') {
                        icon = <Users className="w-4 h-4 text-emerald-400" />;
                      } else if (notif.category === 'payment' || notif.category === 'due_collection') {
                        icon = <CreditCard className="w-4 h-4 text-amber-400" />;
                      } else if (notif.category === 'attendance') {
                        icon = <Calendar className="w-4 h-4 text-sky-400" />;
                      } else if (notif.category === 'renewal' || notif.category === 'trial' || notif.category === 'expiry') {
                        icon = <Calendar className="w-4 h-4 text-purple-400" />;
                      } else if (notif.category === 'suspension') {
                        icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
                      }

                      return (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${notif.isRead ? 'hover:bg-muted/30 bg-card' : 'bg-primary/5 hover:bg-primary/10'}`}
                        >
                          <div className="p-2 rounded-lg bg-muted/65 mt-0.5">{icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className={`text-xs font-bold text-foreground truncate ${notif.isRead ? 'font-medium' : 'font-semibold'}`}>{notif.title}</p>
                              {!notif.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">{new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | {new Date(notif.createdAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <button
                            onClick={(e) => handleDismissNotification(e, notif._id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Dismiss Alert"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 flex items-center gap-1 sm:gap-2 text-sm font-medium cursor-pointer"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};
