import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Dumbbell, Eye, EyeOff, Lock, Mail, PhoneCall } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspendedError, setSuspendedError] = useState<string | null>(null);

  const { login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    setLoading(true);
    setSuspendedError(null);

    try {
      await login(email, password);
      showToast('Logged in successfully!', 'success');
      navigate('/app');
    } catch (err: any) {
      console.error(err);
      if (err.status === 403 && err.data?.status === 'suspended') {
        setSuspendedError(err.message || 'Your account is suspended.');
        showToast('Account suspended.', 'error');
      } else {
        showToast(err.message || 'Invalid email or password.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContactSuperAdmin = () => {
    const text = encodeURIComponent(`Hello Super Admin, my gym owner account (${email}) is suspended. I would like to resolve the renewal details.`);
    window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Landing Page
        </button>
      </div>

      <div className="w-full max-w-md glass p-8 rounded-3xl shadow-2xl relative border border-border">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-primary to-secondary rounded-2xl text-white mb-3 shadow-md">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight">Access Your Console</h2>
          <p className="text-xs text-muted-foreground mt-1">India's leading Gym SaaS Platform</p>
        </div>

        {suspendedError ? (
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-center flex flex-col items-center gap-4">
            <p className="text-sm font-semibold">{suspendedError}</p>
            <p className="text-xs text-rose-300/80">
              Access is locked. Please tap below to negotiate or complete your subscription renewal via WhatsApp.
            </p>
            <button
              onClick={handleContactSuperAdmin}
              className="px-5 py-2.5 rounded-xl font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center gap-2 text-xs"
            >
              Contact Platform Super Admin <PhoneCall className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSuspendedError(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Try another account
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gym.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background/50 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border bg-background/50 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:opacity-95 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Demo Credentials:<br />
        Super Admin: <code className="text-primary">superadmin@ironforge.com</code> / <code className="text-primary">admin123</code>
      </div>
    </div>
  );
};
