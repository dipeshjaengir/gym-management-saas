import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Settings, Save, Dumbbell, Globe, Phone, Palette } from 'lucide-react';

export const GymBrandingSettings: React.FC = () => {
  const { user, updateUserBranding } = useAuth();
  const { showToast } = useNotification();

  const [gymLogo, setGymLogo] = useState('');
  const [gymName, setGymName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      try {
        const data = await api.get('/gymowner/branding');
        setGymLogo(data.logo || '');
        setGymName(data.gymName || '');
        setAddress(data.address || '');
        setContactNumber(data.contactNumber || '');
        setWhatsAppNumber(data.whatsAppNumber || '');
      } catch (err: any) {
        showToast(err.message || 'Error fetching gym branding.', 'error');
      }
    }
    loadBranding();
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName || !address || !contactNumber || !whatsAppNumber) {
      showToast('Please fill out all standard contact parameters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put('/gymowner/branding', {
        logo: gymLogo,
        gymName,
        address,
        contactNumber,
        whatsAppNumber
      });
      showToast('Gym branding configuration saved successfully!', 'success');
      // Sync with global auth state for instantaneous header updates
      updateUserBranding(res.branding);
    } catch (err: any) {
      showToast(err.message || 'Failed to save branding.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gym Branding &amp; Profile</h1>
        <p className="text-xs text-muted-foreground">Configure the gym name, logo, location address, and messaging numbers.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Settings Form */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-card border shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Name</label>
              <input
                type="text"
                required
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                placeholder="e.g. Iron Forge HSR"
                className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Logo (URL)</label>
              <input
                type="url"
                value={gymLogo}
                onChange={(e) => setGymLogo(e.target.value)}
                placeholder="e.g. https://images.unsplash.com/photo-logo..."
                className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 12th Cross, Sector 4, Bangalore"
                className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Number</label>
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. +91 90000 90000"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  required
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  placeholder="e.g. +91 90000 90000"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/10"
            >
              <Save className="w-4 h-4" /> {submitting ? 'Saving Branding...' : 'Save Branding Changes'}
            </button>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 self-start">
            <Palette className="w-3.5 h-3.5 text-primary" /> Live Branding Preview
          </h2>

          <div className="w-20 h-20 rounded-full border bg-background/50 flex items-center justify-center overflow-hidden">
            {gymLogo ? (
              <img src={gymLogo} alt="Gym Logo" className="w-full h-full object-cover" />
            ) : (
              <Dumbbell className="w-8 h-8 text-primary" />
            )}
          </div>

          <div className="space-y-1">
            <div className="font-bold text-base text-foreground">{gymName || 'Iron Forge Gym'}</div>
            <div className="text-[10px] text-muted-foreground font-medium max-w-xs">{address || 'No address set'}</div>
          </div>

          <div className="w-full pt-4 border-t space-y-2 text-xs text-left">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">Office:</span>
              <span className="font-semibold text-foreground">{contactNumber || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-muted-foreground">WhatsApp:</span>
              <span className="font-semibold text-foreground">{whatsAppNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
