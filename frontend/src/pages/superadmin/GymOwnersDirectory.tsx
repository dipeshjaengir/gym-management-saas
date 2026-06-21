import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  UserCheck,
  Building,
  Calendar,
  Lock,
  MessageSquare,
  Plus,
  Trash2,
  Play,
  Pause,
  X,
  Edit2
} from 'lucide-react';

interface GymOwner {
  _id: string;
  gymName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  subscription: {
    planType: '1_month' | '3_month' | '6_month' | '12_month';
    startDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'suspended';
    amountPaid: number;
  };
  createdAt: string;
}

export const GymOwnersDirectory: React.FC = () => {
  const [owners, setOwners] = useState<GymOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [planType, setPlanType] = useState<'1_month' | '3_month' | '6_month' | '12_month'>('3_month');
  const [amountPaid, setAmountPaid] = useState<number>(2499);
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedOwner, setSelectedOwner] = useState<GymOwner | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGymName, setEditGymName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [updating, setUpdating] = useState(false);

  // Renew Modal
  const [renewOwner, setRenewOwner] = useState<GymOwner | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewPlanType, setRenewPlanType] = useState<'1_month' | '3_month' | '6_month' | '12_month'>('3_month');
  const [renewAmountPaid, setRenewAmountPaid] = useState<number>(2499);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/owners');
      setOwners(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching owners directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymName || !ownerName || !email || !password || !phone || !address) {
      showToast('All owner fields are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await api.post('/superadmin/owners', {
        gymName,
        ownerName,
        email,
        password,
        phone,
        address,
        planType,
        amountPaid
      });
      showToast('Gym owner tenant profile created.', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadOwners();
    } catch (err: any) {
      showToast(err.message || 'Error registering tenant.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner) return;
    setUpdating(true);
    try {
      await api.put(`/superadmin/owners/${selectedOwner._id}`, {
        gymName: editGymName,
        ownerName: editOwnerName,
        email: editEmail,
        phone: editPhone,
        address: editAddress
      });
      showToast('Tenant profile updated successfully.', 'success');
      setShowEditModal(false);
      loadOwners();
    } catch (err: any) {
      showToast(err.message || 'Error updating tenant details.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleRenewOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewOwner) return;
    setRenewing(true);
    try {
      await api.put(`/superadmin/owners/${renewOwner._id}/renew`, {
        planType: renewPlanType,
        amountPaid: renewAmountPaid
      });
      showToast('Subscription extended successfully.', 'success');
      setShowRenewModal(false);
      loadOwners();
    } catch (err: any) {
      showToast(err.message || 'Subscription renewal failed.', 'error');
    } finally {
      setRenewing(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await api.put(`/superadmin/owners/${id}/status`, { status: nextStatus });
      showToast(`Tenant status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setOwners(prev => prev.map(o => o._id === id ? { ...o, subscription: { ...o.subscription, status: nextStatus } } : o));
    } catch (err: any) {
      showToast(err.message || 'Error setting tenant status.', 'error');
    }
  };

  const handleDeleteOwner = async (id: string) => {
    if (!window.confirm('Delete this tenant? This soft-deletes the gym owner account.')) return;
    try {
      await api.delete(`/superadmin/owners/${id}`);
      showToast('Tenant profile deleted.', 'success');
      setOwners(prev => prev.filter(o => o._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tenant.', 'error');
    }
  };

  const resetAddForm = () => {
    setGymName('');
    setOwnerName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setPlanType('3_month');
    setAmountPaid(2499);
  };

  const openEditModal = (owner: GymOwner) => {
    setSelectedOwner(owner);
    setEditGymName(owner.gymName);
    setEditOwnerName(owner.ownerName);
    setEditEmail(owner.email);
    setEditPhone(owner.phone);
    setEditAddress(owner.address);
    setShowEditModal(true);
  };

  const openRenewModal = (owner: GymOwner) => {
    setRenewOwner(owner);
    setRenewPlanType(owner.subscription.planType);
    setRenewAmountPaid(owner.subscription.amountPaid);
    setShowRenewModal(true);
  };

  // Adjust amount paid when plan changes in modals
  const getPlanPrice = (plan: string) => {
    if (plan === '1_month') return 999;
    if (plan === '3_month') return 2499;
    if (plan === '6_month') return 4499;
    return 7999; // 12 month
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Owners Directory</h1>
          <p className="text-xs text-muted-foreground">Register tenants and manage platform billing subscriptions.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Register Gym Owner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : owners.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No gym owners registered yet. Click "Register Gym Owner" to begin.</p>
        </div>
      ) : (
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {owners.map((owner) => (
              <div key={owner._id} className="p-4 rounded-2xl bg-card border space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base">{owner.gymName}</div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      owner.subscription.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : owner.subscription.status === 'suspended'
                        ? 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                        : 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {owner.subscription.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Owner: <span className="text-foreground">{owner.ownerName}</span></div>
                  <div>Email: <span className="text-foreground">{owner.email}</span></div>
                  <div>Phone: <span className="text-foreground">{owner.phone}</span></div>
                  <div>Plan: <span className="text-foreground uppercase font-medium">{owner.subscription.planType}</span></div>
                  <div>Expires: <span className="text-foreground font-semibold">{new Date(owner.subscription.expiryDate).toLocaleDateString('en-IN')}</span></div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <button
                    onClick={() => openEditModal(owner)}
                    className="flex-grow py-2 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => openRenewModal(owner)}
                    className="flex-grow py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Renew Plan
                  </button>
                  <button
                    onClick={() => toggleStatus(owner._id, owner.subscription.status)}
                    className={`p-2 rounded-lg border transition-colors ${
                      owner.subscription.status === 'suspended'
                        ? 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                        : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                    }`}
                    title={owner.subscription.status === 'suspended' ? 'Activate Tenant' : 'Suspend Tenant'}
                  >
                    {owner.subscription.status === 'suspended' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeleteOwner(owner._id)}
                    className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Tenant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Gym &amp; Owner Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Contact Info</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Plan Type</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Expiry Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {owners.map((owner) => (
                  <tr key={owner._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{owner.gymName}</div>
                      <div className="text-xs text-muted-foreground">{owner.ownerName}</div>
                    </td>
                    <td className="p-4">
                      <div>{owner.email}</div>
                      <div className="text-xs text-muted-foreground">{owner.phone}</div>
                    </td>
                    <td className="p-4 uppercase font-semibold text-xs text-primary">{owner.subscription.planType}</td>
                    <td className="p-4 font-semibold text-xs">
                      {new Date(owner.subscription.expiryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          owner.subscription.status === 'active'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                            : owner.subscription.status === 'suspended'
                            ? 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                            : 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {owner.subscription.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(owner)}
                        className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openRenewModal(owner)}
                        className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Renew
                      </button>
                      <button
                        onClick={() => toggleStatus(owner._id, owner.subscription.status)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          owner.subscription.status === 'suspended'
                            ? 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                            : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                        }`}
                        title={owner.subscription.status === 'suspended' ? 'Activate' : 'Suspend'}
                      >
                        {owner.subscription.status === 'suspended' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteOwner(owner._id)}
                        className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Tenant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Gym Owner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register Gym Owner Account</h2>

            <form onSubmit={handleCreateOwner} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Name</label>
                  <input
                    type="text"
                    required
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g. Iron Forge Hub"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Amit Patel"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@gmail.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 99000 99000"
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
                    placeholder="e.g. 5th Main Rd, Sector 6, HSR Layout"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Initial Subscription Plan</label>
                  <select
                    value={planType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setPlanType(type);
                      setAmountPaid(getPlanPrice(type));
                    }}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="1_month">1 Month (₹999)</option>
                    <option value="3_month">3 Month (₹2499)</option>
                    <option value="6_month">6 Month (₹4499)</option>
                    <option value="12_month">12 Month (₹7999)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount Collected (₹)</label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {adding ? 'Creating...' : 'Register Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Gym Owner Modal */}
      {showEditModal && selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Owner Details</h2>

            <form onSubmit={handleEditOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Name</label>
                <input
                  type="text"
                  required
                  value={editGymName}
                  onChange={(e) => setEditGymName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Subscription Modal */}
      {showRenewModal && renewOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowRenewModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-2">Renew / Extend Subscription</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Extending billing plan for: <span className="font-bold text-foreground">{renewOwner.gymName}</span>
            </p>

            <form onSubmit={handleRenewOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Subscription Plan</label>
                <select
                  value={renewPlanType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setRenewPlanType(type);
                    setRenewAmountPaid(getPlanPrice(type));
                  }}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                >
                  <option value="1_month">1 Month (₹999)</option>
                  <option value="3_month">3 Month (₹2499)</option>
                  <option value="6_month">6 Month (₹4499)</option>
                  <option value="12_month">12 Month (₹7999)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount Collected (₹)</label>
                <input
                  type="number"
                  required
                  value={renewAmountPaid}
                  onChange={(e) => setRenewAmountPaid(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {renewing ? 'Renewing...' : 'Extend Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
