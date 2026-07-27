import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { exportToCSV } from '../../utils/exportHelpers';
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
  Edit2,
  Copy,
  Download,
  History,
  Gift,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface SubscriptionHistoryItem {
  planType: string;
  amountPaid: number;
  startDate: string;
  expiryDate: string;
  renewedBy: string;
  transactionDate: string;
}

interface SubscriptionTimelineEntry {
  action: 'renewed' | 'extended' | 'complimentary' | 'paused' | 'resumed' | 'plan_changed';
  date: string;
  adminName: string;
  reason: string;
  details?: string;
}

interface GymOwner {
  _id: string;
  gymName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  status: 'pending_activation' | 'active' | 'suspended';
  subscription: {
    planType: string;
    startDate: string;
    expiryDate: string;
    status: 'active' | 'expired' | 'suspended' | 'paused';
    amountPaid: number;
  };
  isTrial?: boolean;
  subscriptionHistory?: SubscriptionHistoryItem[];
  subscriptionTimeline?: SubscriptionTimelineEntry[];
  pausedAt?: string | null;
  pauseRemainingDays?: number;
  pauseUntilDate?: string | null;
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
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Activation Link Modal
  const [activationLinkModal, setActivationLinkModal] = useState<string | null>(null);

  // Edit Modal
  const [selectedOwner, setSelectedOwner] = useState<GymOwner | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGymName, setEditGymName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [updating, setUpdating] = useState(false);

  // Manage Subscription Modal
  const [manageOwner, setManageOwner] = useState<GymOwner | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [manageAction, setManageAction] = useState<'extend' | 'complimentary' | 'set_dates' | 'change_plan' | 'pause' | 'resume'>('extend');
  const [auditReason, setAuditReason] = useState('');
  
  // Action specific states
  const [extendDays, setExtendDays] = useState('30');
  const [compDays, setCompDays] = useState('15');
  const [compReasonSelect, setCompReasonSelect] = useState('Festival Offer');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [newPlanType, setNewPlanType] = useState('Basic');
  const [pauseUntilDate, setPauseUntilDate] = useState('');

  // Confirmation screen state
  const [confirmData, setConfirmData] = useState<{
    title: string;
    currentPlan: string;
    currentExpiry: string;
    newExpiry: string;
    payload: any;
  } | null>(null);

  const [submittingManage, setSubmittingManage] = useState(false);
  const [platformPlans, setPlatformPlans] = useState<any[]>([]);
  const [historyOwner, setHistoryOwner] = useState<GymOwner | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadOwners();
    loadPlans();
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

  const loadPlans = async () => {
    try {
      const data = await api.get('/superadmin/plans');
      setPlatformPlans(data);
    } catch (err: any) {
      console.error('Error fetching platform plans:', err);
    }
  };

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    setFormErrors({});

    if (!gymName) errors.gymName = 'Gym Name is required.';
    if (!ownerName) errors.ownerName = 'Owner Name is required.';
    
    const phoneRegex = /^\d{10}$/;
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(phone)) {
      errors.phone = 'Phone number must contain exactly 10 digits.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = 'Email is required.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Validation Failed', 'error');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post('/superadmin/owners', {
        gymName,
        ownerName,
        email,
        phone
      });
      showToast('Gym owner account created successfully.', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadOwners();

      // Show activation token link
      if (res.owner && res.owner.activationToken) {
        const link = window.location.origin + '/activate-account?token=' + res.owner.activationToken;
        setActivationLinkModal(link);
      }
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

  const handlePreSubmitManage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageOwner) return;

    if (!auditReason.trim()) {
      showToast('An audit reason is mandatory for manual subscription adjustments.', 'error');
      return;
    }

    const currentExpiry = new Date(manageOwner.subscription.expiryDate).toLocaleDateString('en-IN');
    let title = '';
    let newExpiry = currentExpiry;
    let payload: any = {
      action: manageAction,
      reason: `${manageAction === 'complimentary' ? compReasonSelect + ' - ' : ''}${auditReason.trim()}`
    };

    if (manageAction === 'extend') {
      const days = parseInt(extendDays);
      if (isNaN(days) || days <= 0) return showToast('Please enter a valid number of days.', 'error');
      title = `Extend Subscription by +${days} Days`;
      const date = new Date(manageOwner.subscription.expiryDate);
      date.setDate(date.getDate() + days);
      newExpiry = date.toLocaleDateString('en-IN');
      payload.days = days;
    } 
    else if (manageAction === 'complimentary') {
      const days = parseInt(compDays);
      if (isNaN(days) || days <= 0) return showToast('Please enter a valid number of days.', 'error');
      title = `Grant ${days} Complimentary Days`;
      const date = new Date(manageOwner.subscription.expiryDate);
      date.setDate(date.getDate() + days);
      newExpiry = date.toLocaleDateString('en-IN');
      payload.days = days;
    } 
    else if (manageAction === 'set_dates') {
      if (!customStartDate || !customEndDate) return showToast('Please enter both start and end dates.', 'error');
      title = 'Set Custom Dates';
      newExpiry = new Date(customEndDate).toLocaleDateString('en-IN');
      payload.startDate = customStartDate;
      payload.expiryDate = customEndDate;
    } 
    else if (manageAction === 'change_plan') {
      title = `Change Active Plan to ${newPlanType}`;
      payload.planType = newPlanType;
    } 
    else if (manageAction === 'pause') {
      if (!pauseUntilDate) return showToast('Please select a pause-until date.', 'error');
      title = `Pause Subscription until ${new Date(pauseUntilDate).toLocaleDateString('en-IN')}`;
      payload.pauseUntilDate = pauseUntilDate;
    } 
    else if (manageAction === 'resume') {
      title = 'Resume Paused Subscription';
      const remainingDays = manageOwner.pauseRemainingDays || 0;
      const date = new Date();
      date.setDate(date.getDate() + remainingDays);
      newExpiry = date.toLocaleDateString('en-IN');
    }

    setConfirmData({
      title,
      currentPlan: manageOwner.subscription.planType,
      currentExpiry,
      newExpiry,
      payload
    });
  };

  const handleExecuteManage = async () => {
    if (!manageOwner || !confirmData) return;
    setSubmittingManage(true);
    try {
      await api.put(`/superadmin/owners/${manageOwner._id}/subscription`, confirmData.payload);
      showToast('Subscription settings successfully updated.', 'success');
      setConfirmData(null);
      setShowManageModal(false);
      setAuditReason('');
      loadOwners();
    } catch (err: any) {
      showToast(err.message || 'Subscription update failed.', 'error');
    } finally {
      setSubmittingManage(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await api.put(`/superadmin/owners/${id}/status`, { status: nextStatus });
      showToast(`Tenant status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setOwners(prev => prev.map(o => o._id === id ? { ...o, status: nextStatus, subscription: { ...o.subscription, status: nextStatus } } : o));
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
    setPhone('');
  };

  const openEditModal = (owner: GymOwner) => {
    setSelectedOwner(owner);
    setEditGymName(owner.gymName);
    setEditOwnerName(owner.ownerName);
    setEditEmail(owner.email);
    setEditPhone(owner.phone);
    setEditAddress(owner.address || '');
    setShowEditModal(true);
  };

  const openManageModal = (owner: GymOwner) => {
    setManageOwner(owner);
    setManageAction('extend');
    setAuditReason('');
    setExtendDays('30');
    setCompDays('15');
    setCompReasonSelect('Festival Offer');
    setCustomStartDate(owner.subscription.startDate ? new Date(owner.subscription.startDate).toISOString().split('T')[0] : '');
    setCustomEndDate(owner.subscription.expiryDate ? new Date(owner.subscription.expiryDate).toISOString().split('T')[0] : '');
    setNewPlanType(owner.subscription.planType);
    setPauseUntilDate('');
    setConfirmData(null);
    setShowManageModal(true);
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'active') {
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
    }
    if (status === 'suspended') {
      return 'bg-rose-950/40 text-rose-400 border-rose-500/20';
    }
    return 'bg-amber-950/40 text-amber-400 border-amber-500/20'; // pending activation
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending_activation') return 'Pending Activation';
    if (status === 'active') return 'Active';
    if (status === 'suspended') return 'Suspended';
    return status;
  };

  const handleExportCSV = () => {
    const data = owners.map(o => {
      const isTrial = o.isTrial;
      let planDisplay = o.subscription.planType;
      if (isTrial) {
        const expiry = new Date(o.subscription.expiryDate);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffTime = expiry.getTime() - todayStart.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        planDisplay = `7 DAY TRIAL (${diffDays > 0 ? diffDays : 0} Days Left)`;
      }
      return {
        'Gym Name': o.gymName,
        'Owner Name': o.ownerName,
        'Email': o.email,
        'Phone': o.phone,
        'Address': o.address || 'N/A',
        'Status': o.status,
        'Plan Type': planDisplay,
        'Expiry Date': new Date(o.subscription.expiryDate).toLocaleDateString('en-IN'),
        'Amount Paid': o.subscription.amountPaid,
        'Created Date': new Date(o.createdAt).toLocaleDateString('en-IN')
      };
    });
    exportToCSV(data, 'gym_owners_directory');
  };

  const getPlanDisplay = (owner: GymOwner) => {
    if (owner.isTrial) {
      const expiry = new Date(owner.subscription.expiryDate);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = expiry.getTime() - todayStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `7 DAY TRIAL (${diffDays > 0 ? diffDays : 0} Days Left)`;
    }
    return owner.subscription.planType;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Owners Directory</h1>
          <p className="text-xs text-muted-foreground">Register gym owners and monitor platform statuses.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm flex-1 sm:flex-none cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md flex-1 sm:flex-none cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Register Gym Owner
          </button>
        </div>
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
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeStyle(owner.status)}`}>
                    {getStatusLabel(owner.status)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Owner: <span className="text-foreground">{owner.ownerName}</span></div>
                  <div>Email: <span className="text-foreground">{owner.email}</span></div>
                  <div>Phone: <span className="text-foreground">{owner.phone}</span></div>
                  <div>Plan: <span className="text-foreground uppercase font-medium">{getPlanDisplay(owner)}</span></div>
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
                    onClick={() => openManageModal(owner)}
                    className="flex-grow py-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Manage Subscription
                  </button>
                  <button
                    onClick={() => {
                      setHistoryOwner(owner);
                      setShowHistoryModal(true);
                    }}
                    className="flex-grow py-2 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" /> History
                  </button>
                  <button
                    onClick={() => toggleStatus(owner._id, owner.status)}
                    className={`p-2 rounded-lg border transition-colors ${
                      owner.status === 'suspended'
                        ? 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                        : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                    }`}
                    title={owner.status === 'suspended' ? 'Activate Tenant' : 'Suspend Tenant'}
                  >
                    {owner.status === 'suspended' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
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
                    <td className="p-4 uppercase font-semibold text-xs text-primary">{getPlanDisplay(owner)}</td>
                    <td className="p-4 font-semibold text-xs">
                      {new Date(owner.subscription.expiryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeStyle(owner.status)}`}>
                        {getStatusLabel(owner.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setHistoryOwner(owner);
                          setShowHistoryModal(true);
                        }}
                        className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Subscription History"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(owner)}
                        className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openManageModal(owner)}
                        className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Manage
                      </button>
                      <button
                        onClick={() => toggleStatus(owner._id, owner.status)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          owner.status === 'suspended'
                            ? 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                            : 'text-amber-400 hover:bg-amber-500/10 border-amber-500/30'
                        }`}
                        title={owner.status === 'suspended' ? 'Activate' : 'Suspend'}
                      >
                        {owner.status === 'suspended' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
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

      {/* Add Gym Owner Modal (Simplified) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1">Register Gym Owner</h2>
            <p className="text-xs text-muted-foreground mb-4">Creates account in Pending Activation state.</p>

            <form onSubmit={handleCreateOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Name</label>
                <input
                  type="text"
                  required
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. GymLedger Hub"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                {formErrors.gymName && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.gymName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                {formErrors.ownerName && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.ownerName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                {formErrors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number (10 Digits)</label>
                <input
                  type="tel"
                  required
                  pattern="\d{10}"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 7742111581"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                {formErrors.phone && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.phone}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {adding ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activation Link Modal */}
      {activationLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative text-center">
            <h3 className="text-lg font-bold mb-2 text-foreground">Gym Owner Registered Successfully!</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Copy the activation link below and send it to the gym owner. They will set their password to activate the account.
            </p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={activationLinkModal}
                className="flex-grow px-3 py-2.5 rounded-xl border bg-muted text-xs focus:outline-none select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activationLinkModal);
                  showToast('Link copied to clipboard!', 'success');
                }}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-colors flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <button
              onClick={() => setActivationLinkModal(null)}
              className="px-6 py-2.5 bg-muted hover:bg-muted/80 border rounded-xl font-semibold text-xs transition-colors w-full"
            >
              Close Window
            </button>
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

      {/* Manage Subscription Modal */}
      {showManageModal && manageOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowManageModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1 text-foreground">Manage Subscription</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Adjust billing parameters and custom plan controls for: <span className="font-bold text-foreground">{manageOwner.gymName}</span>
            </p>

            {confirmData ? (
              /* Confirmation Dialog */
              <div className="flex-grow flex flex-col justify-center items-center py-10 space-y-6 max-w-md mx-auto text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 animate-bounce" />
                <h3 className="text-lg font-bold text-foreground">{confirmData.title}</h3>
                
                <div className="w-full space-y-2 bg-muted/30 p-4 rounded-2xl border text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Plan:</span>
                    <span className="font-semibold text-foreground uppercase">{confirmData.currentPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Expiry:</span>
                    <span className="font-semibold text-foreground">{confirmData.currentExpiry}</span>
                  </div>
                  {confirmData.newExpiry !== confirmData.currentExpiry && (
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-muted-foreground">New Expiry:</span>
                      <span className="font-bold text-primary">{confirmData.newExpiry}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-foreground font-medium">Are you sure you want to continue?</p>

                <div className="flex gap-4 w-full">
                  <button
                    type="button"
                    onClick={() => setConfirmData(null)}
                    className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteManage}
                    disabled={submittingManage}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer"
                  >
                    {submittingManage ? 'Executing...' : 'Yes, Confirm'}
                  </button>
                </div>
              </div>
            ) : (
              /* Adjustment Controls & Timeline */
              <div className="flex-grow grid grid-cols-1 md:grid-cols-5 gap-6 overflow-hidden">
                {/* Left Panel: Adjustments (3 cols) */}
                <form onSubmit={handlePreSubmitManage} className="md:col-span-3 space-y-4 flex flex-col justify-between overflow-y-auto pr-1">
                  <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-xl border text-xs font-semibold">
                      {(['extend', 'complimentary', 'set_dates', 'change_plan', 'pause', 'resume'] as const).map((act) => {
                        // Hide resume if not paused, hide pause if already paused
                        if (act === 'resume' && manageOwner.subscription.status !== 'paused') return null;
                        if (act === 'pause' && manageOwner.subscription.status === 'paused') return null;

                        return (
                          <button
                            key={act}
                            type="button"
                            onClick={() => setManageAction(act)}
                            className={`flex-grow px-2 py-1.5 rounded-lg text-center uppercase tracking-wider transition-all cursor-pointer ${
                              manageAction === act ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            {act.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action Form Inputs */}
                    {manageAction === 'extend' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Extend Expiry Date By</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['7', '15', '30', '60'].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setExtendDays(d)}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                extendDays === d ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                              }`}
                            >
                              +{d} Days
                            </button>
                          ))}
                          <div className="col-span-3 flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground shrink-0">Custom Days:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Enter custom days"
                              value={['7', '15', '30', '60'].includes(extendDays) ? '' : extendDays}
                              onChange={(e) => setExtendDays(e.target.value)}
                              className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {manageAction === 'complimentary' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Grant Complimentary Subscription</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['7', '15', '30'].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setCompDays(d)}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                compDays === d ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                              }`}
                            >
                              {d} Days
                            </button>
                          ))}
                          <div className="col-span-3 flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground shrink-0">Custom Days:</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Enter custom days"
                              value={['7', '15', '30'].includes(compDays) ? '' : compDays}
                              onChange={(e) => setCompDays(e.target.value)}
                              className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 mt-2">
                          <label className="block text-xs font-semibold text-muted-foreground uppercase">Complimentary Reason *</label>
                          <select
                            value={compReasonSelect}
                            onChange={(e) => setCompReasonSelect(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                          >
                            <option value="Festival Offer">Festival Offer</option>
                            <option value="Referral Reward">Referral Reward</option>
                            <option value="Technical Compensation">Technical Compensation</option>
                            <option value="Promotional Offer">Promotional Offer</option>
                            <option value="Manual Adjustment">Manual Adjustment</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {manageAction === 'set_dates' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                          <input
                            type="date"
                            required
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expiry Date</label>
                          <input
                            type="date"
                            required
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {manageAction === 'change_plan' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Select Active Plan</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Trial', 'Basic', 'Premium', 'Enterprise'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewPlanType(p)}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                newPlanType === p ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {manageAction === 'pause' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl text-[11px]">
                          Pausing subscription freezes active days. Remaining subscription days will be preserved.
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Pause Until Date</label>
                          <input
                            type="date"
                            required
                            value={pauseUntilDate}
                            onChange={(e) => setPauseUntilDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {manageAction === 'resume' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl text-[11px]">
                          This action will resume the paused subscription. New expiry date will be calculated automatically by adding the preserved remaining days ({manageOwner.pauseRemainingDays || 0} days) to the current date.
                        </div>
                      </div>
                    )}

                    {/* Mandatory Audit Reason */}
                    <div className="space-y-1 pt-2 border-t">
                      <label className="block text-xs font-bold text-foreground flex items-center gap-1">
                        Audit &amp; Compliance Reason <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={auditReason}
                        onChange={(e) => setAuditReason(e.target.value)}
                        placeholder="e.g. Approved custom discount code, festival incentive"
                        className="w-full px-4 py-2.5 rounded-xl border bg-background text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t mt-4">
                    <button
                      type="button"
                      onClick={() => setShowManageModal(false)}
                      className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Continue Action
                    </button>
                  </div>
                </form>

                {/* Right Panel: Subscription Timeline (2 cols) */}
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6 flex flex-col h-full overflow-hidden">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" /> Subscription Timeline
                  </h3>
                  
                  <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                    {!manageOwner.subscriptionTimeline || manageOwner.subscriptionTimeline.length === 0 ? (
                      <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                        <p className="text-xs text-muted-foreground">No adjustments logged in timeline yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 border-l-2 border-muted pl-4 ml-2">
                        {manageOwner.subscriptionTimeline.map((t, idx) => (
                          <div key={idx} className="relative space-y-1 pb-1">
                            <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{new Date(t.date).toLocaleDateString('en-IN')} {new Date(t.date).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}</span>
                              <span className="font-semibold text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{t.action}</span>
                            </div>
                            <p className="text-[11px] font-bold text-foreground">{t.details || t.action.replace('_', ' ')}</p>
                            <p className="text-[10px] text-slate-300 italic">" {t.reason} "</p>
                            <p className="text-[9px] text-muted-foreground">Admin: {t.adminName}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription History Modal */}
      {showHistoryModal && historyOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 max-h-[85vh] flex flex-col">
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setHistoryOwner(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1 text-foreground">Subscription History</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Billing logs for <span className="text-primary font-semibold">{historyOwner.gymName}</span>
            </p>

            <div className="flex-grow overflow-y-auto pr-1">
              {!historyOwner.subscriptionHistory || historyOwner.subscriptionHistory.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                  <p className="text-sm text-muted-foreground">No historical subscription payments logged for this owner.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                        <th className="p-3">Plan Name</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Date Range</th>
                        <th className="p-3">Renewed By</th>
                        <th className="p-3">Txn Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {historyOwner.subscriptionHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-semibold text-primary">{h.planType}</td>
                          <td className="p-3 font-bold text-foreground">₹{h.amountPaid}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(h.startDate).toLocaleDateString('en-IN')} - {new Date(h.expiryDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-3 text-muted-foreground">{h.renewedBy}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(h.transactionDate).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowHistoryModal(false);
                setHistoryOwner(null);
              }}
              className="mt-6 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
