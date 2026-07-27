import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Lock, ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { APP_VERSION, BUILD_NUMBER, COPYRIGHT } from '../utils/version';

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { showToast } = useNotification();

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<any>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await api.get(`/public/activate-account/${token}`);
      if (res.valid) {
        setValid(true);
        setOwnerInfo(res.owner);
      } else {
        setValid(false);
      }
    } catch (err) {
      setValid(false);
    } finally {
      setChecking(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    // Password strength check
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      showToast('Password must contain uppercase, lowercase, number, and special character.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/public/activate-account/${token}`, {
        password,
        confirmPassword
      });

      showToast('Account activated successfully!', 'success');
      loginWithToken(res.token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Activation failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying activation token...</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-950/50 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <XCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Invalid or Expired Link</h1>
            <p className="text-sm text-muted-foreground">
              This activation token is invalid, expired, or has already been used. Please request a new activation link from your Super Admin.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl text-sm transition-all"
          >
            Go to Login
          </button>
        </div>
        <footer className="mt-8 text-center text-xs footer-text flex flex-col items-center justify-center space-y-1">
          <p>{COPYRIGHT} SaaS Gym Management.</p>
          <p>
            Designed & Developed by{' '}
            <span className="text-[#F59E0B] font-semibold">Dipesh Jangir</span>
          </p>
          <p className="text-[10px] opacity-75 mt-0.5">Version {APP_VERSION} (Build {BUILD_NUMBER})</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size={56} className="mb-2" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Activate Your Account</h1>
          <p className="text-xs text-muted-foreground">
            Setup a secure password to activate your <span className="font-semibold text-primary">{ownerInfo?.gymName}</span> portal.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
            <input
              type="email"
              disabled
              value={ownerInfo?.email || ''}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-muted-foreground text-sm focus:outline-none cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-primary focus:outline-none transition-colors pl-10"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1 mt-1 pl-1">
              <p className="flex items-center gap-1">
                <CheckCircle2 className={`w-3 h-3 ${password.length >= 6 ? 'text-emerald-400' : 'text-slate-600'}`} />
                At least 6 characters long
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle2 className={`w-3 h-3 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : 'text-slate-600'}`} />
                Uppercase & lowercase letters
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle2 className={`w-3 h-3 ${/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-600'}`} />
                At least one number & special symbol
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:border-primary focus:outline-none transition-colors pl-10"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl text-sm transition-all shadow-md shadow-primary/20"
          >
            {submitting ? 'Activating Portal...' : 'Activate & Login'}
          </button>
        </form>
      </div>
      <footer className="mt-8 text-center text-xs footer-text flex flex-col items-center justify-center space-y-1">
        <p>{COPYRIGHT} SaaS Gym Management.</p>
        <p>
          Designed & Developed by{' '}
          <span className="text-[#F59E0B] font-semibold">Dipesh Jangir</span>
        </p>
        <p className="text-[10px] opacity-75 mt-0.5">Version {APP_VERSION} (Build {BUILD_NUMBER})</p>
      </footer>
    </div>
  );
};
