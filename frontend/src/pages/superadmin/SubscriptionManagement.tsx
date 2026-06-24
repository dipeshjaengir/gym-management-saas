import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Plus, Trash2, Edit2, X, Shield, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react';

interface PlatformPlan {
  _id: string;
  name: string;
  price: number;
  durationMonths: number;
  description: string;
  features: string[];
  status: 'active' | 'inactive';
}

export const SubscriptionManagement: React.FC = () => {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(179);
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(179);
  const [editDurationMonths, setEditDurationMonths] = useState<number>(1);
  const [editDescription, setEditDescription] = useState('');
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editFeatureInput, setEditFeatureInput] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/plans');
      setPlans(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching platform plans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault();
    if (!featureInput.trim()) return;
    setFeatures([...features, featureInput.trim()]);
    setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleEditAddFeature = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault();
    if (!editFeatureInput.trim()) return;
    setEditFeatures([...editFeatures, editFeatureInput.trim()]);
    setEditFeatureInput('');
  };

  const handleEditRemoveFeature = (index: number) => {
    setEditFeatures(editFeatures.filter((_, i) => i !== index));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === undefined || !durationMonths) {
      showToast('Name, Price, and Duration are required.', 'error');
      return;
    }

    setAdding(true);
    try {
      await api.post('/superadmin/plans', {
        name,
        price,
        durationMonths,
        description,
        features,
        status
      });
      showToast('Platform plan created successfully.', 'success');
      setShowAddModal(false);
      resetForm();
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Error creating platform plan.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setUpdating(true);
    try {
      await api.put(`/superadmin/plans/${selectedPlan._id}`, {
        name: editName,
        price: editPrice,
        durationMonths: editDurationMonths,
        description: editDescription,
        features: editFeatures,
        status: editStatus
      });
      showToast('Platform plan updated successfully.', 'success');
      setShowEditModal(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Error updating platform plan.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const togglePlanStatus = async (plan: PlatformPlan) => {
    try {
      const nextStatus = plan.status === 'active' ? 'inactive' : 'active';
      await api.put(`/superadmin/plans/${plan._id}`, { status: nextStatus });
      showToast(`Plan status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, status: nextStatus } : p));
    } catch (err: any) {
      showToast(err.message || 'Error updating plan status.', 'error');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;

    try {
      await api.delete(`/superadmin/plans/${id}`);
      showToast('Platform plan deleted.', 'success');
      setPlans(prev => prev.filter(p => p._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan.', 'error');
    }
  };

  const resetForm = () => {
    setName('');
    setPrice(179);
    setDurationMonths(1);
    setDescription('');
    setFeatures([]);
    setFeatureInput('');
    setStatus('active');
  };

  const openEditModal = (plan: PlatformPlan) => {
    setSelectedPlan(plan);
    setEditName(plan.name);
    setEditPrice(plan.price);
    setEditDurationMonths(plan.durationMonths);
    setEditDescription(plan.description || '');
    setEditFeatures(plan.features || []);
    setEditFeatureInput('');
    setEditStatus(plan.status);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-xs text-muted-foreground">Configure global subscription plans offered to gym owners.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Create Plan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No subscription plans configured yet. Click "Create Plan" to begin.</p>
        </div>
      ) : (
        <>
          {/* Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className={`p-6 rounded-3xl bg-card border relative flex flex-col justify-between shadow-sm transition-all duration-300 ${
                  plan.status === 'inactive' ? 'opacity-60 grayscale' : 'hover:shadow-md hover:border-slate-800'
                }`}
              >
                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-1.5 z-10">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 border bg-background/50 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePlanStatus(plan)}
                    className="p-1.5 border bg-background/50 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    title={plan.status === 'active' ? 'Deactivate Plan' : 'Activate Plan'}
                  >
                    {plan.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan._id)}
                    className="p-1.5 border border-rose-500/20 bg-background/50 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {plan.durationMonths} {plan.durationMonths === 1 ? 'Month' : 'Months'}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-foreground pr-16">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{plan.description || 'No description provided.'}</p>
                  </div>

                  <div className="flex items-baseline gap-1 py-2 border-y border-slate-900/10 dark:border-slate-100/10">
                    <span className="text-2xl font-extrabold text-foreground">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/ billing period</span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">What's Included:</h4>
                    {plan.features && plan.features.length > 0 ? (
                      <ul className="text-xs space-y-1.5">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary font-bold">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Standard platform features</p>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                      plan.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    ● {plan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Create Platform Plan</h2>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly, Yearly"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plan description, value propositions..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none h-20 resize-none"
                />
              </div>

              {/* Features Input List */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Features / Inclusions</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={handleAddFeature}
                    placeholder="e.g. WhatsApp Reminders"
                    className="flex-grow px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                  {features.map((feat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs border"
                    >
                      {feat}
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="text-rose-500 hover:text-rose-600 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
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
                  {adding ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Platform Plan</h2>

            <form onSubmit={handleEditPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editDurationMonths}
                    onChange={(e) => setEditDurationMonths(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none h-20 resize-none"
                />
              </div>

              {/* Features Input List */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Features / Inclusions</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editFeatureInput}
                    onChange={(e) => setEditFeatureInput(e.target.value)}
                    onKeyDown={handleEditAddFeature}
                    placeholder="e.g. WhatsApp Reminders"
                    className="flex-grow px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleEditAddFeature}
                    className="px-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                  {editFeatures.map((feat, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs border"
                    >
                      {feat}
                      <button
                        type="button"
                        onClick={() => handleEditRemoveFeature(index)}
                        className="text-rose-500 hover:text-rose-600 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
