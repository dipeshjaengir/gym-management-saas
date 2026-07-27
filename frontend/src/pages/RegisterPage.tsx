import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Dumbbell, Save, ArrowLeft, Building2, User as UserIcon, Phone, MapPin, Globe } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { showToast } = useNotification();

  // Extract secure Google state passed from LoginPage
  const state = location.state as { googleToken?: string; email?: string; name?: string } | null;

  const [ownerName, setOwnerName] = useState(state?.name || '');
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('India');
  const [businessInfo, setBusinessInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Security Guard: Kick user back to login if they try to access register directly without Google Token
  useEffect(() => {
    if (!state || !state.googleToken) {
      showToast('Please authenticate with Google first to complete registration.', 'error');
      navigate('/login', { replace: true });
    }
  }, [state, navigate, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName || !ownerName || !phone || !city || !stateName || !country) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register-google', {
        credential: state?.googleToken,
        gymName,
        ownerName,
        phone,
        address,
        city,
        state: stateName,
        country,
        businessInfo
      });

      showToast('Business account registered successfully! Welcoming to your dashboard.', 'success');
      
      // Save session and log user in automatically
      loginWithToken(res.token, res.user);
      navigate('/app', { replace: true });

    } catch (err: any) {
      showToast(err.message || 'Failed to complete registration onboarding.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Dumbbell className="w-7 h-7 text-black stroke-[2.5]" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Complete Your Registration
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Onboard your business to start your 30-day free trial trial of GymLedger
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
          
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-300">Identity Authenticated via Google</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{state?.email}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-primary" /> Owner Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Gym Name *
                </label>
                <input
                  type="text"
                  required
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. Iron Forge HSR"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> State *
                </label>
                <input
                  type="text"
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Country *
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Business Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 12th Cross, Sector 4, Bangalore"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Business Description (Optional)
              </label>
              <textarea
                value={businessInfo}
                onChange={(e) => setBusinessInfo(e.target.value)}
                placeholder="Brief description of your gym or fitness center..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0e1321] text-slate-100 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
              />
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 py-3 border border-slate-800 hover:bg-slate-800/50 text-slate-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] py-3 bg-gradient-to-r from-primary to-amber-500 hover:brightness-105 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/15"
              >
                <Save className="w-4 h-4" /> {submitting ? 'Registering...' : 'Register Business'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
