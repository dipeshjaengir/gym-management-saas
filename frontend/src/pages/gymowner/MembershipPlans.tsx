import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Award, Plus, Trash2, Edit3, X, Play, Pause } from 'lucide-react';
import { ResponsiveModal } from '../../components/ResponsiveModal';

interface Plan {
  _id: string;
  name: string;
  durationMonths: number;
  price: number;
  status: 'active' | 'inactive';
}

export const MembershipPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDurationMonths, setEditDurationMonths] = useState<number | ''>('');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.get('/plans');
      setPlans(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching plans list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !durationMonths || !price) {
      showToast('All plan fields are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await api.post('/plans', {
        name,
        durationMonths,
        price,
        status
      });
      showToast('Membership plan created successfully.', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to create plan.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setUpdating(true);
    try {
      await api.put(`/plans/${selectedPlan._id}`, {
        name: editName,
        durationMonths: editDurationMonths,
        price: editPrice,
        status: editStatus
      });
      showToast('Membership plan updated.', 'success');
      setShowEditModal(false);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Error updating membership plan.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this membership plan?')) return;
    try {
      await api.delete(`/plans/${id}`);
      showToast('Plan deleted.', 'success');
      setPlans(prev => prev.filter(p => p._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan.', 'error');
    }
  };

  const toggleStatus = async (plan: Plan) => {
    const nextStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/plans/${plan._id}`, { status: nextStatus });
      showToast(`Plan status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setPlans(prev => prev.map(p => p._id === plan._id ? { ...p, status: nextStatus } : p));
    } catch (err: any) {
      showToast(err.message || 'Error toggling plan status.', 'error');
    }
  };

  const resetAddForm = () => {
    setName('');
    setDurationMonths('');
    setPrice('');
    setStatus('active');
  };

  const openEditModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditName(plan.name);
    setEditDurationMonths(plan.durationMonths);
    setEditPrice(plan.price);
    setEditStatus(plan.status);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membership Plans</h1>
          <p className="text-xs text-muted-foreground">Configure the fitness packages and subscription structures for gym members.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Create Package
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No custom plans configured yet. Click "Create Package" to start mapping packages.</p>
        </div>
      ) : (
        /* Mobile Friendly Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all duration-300 relative flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Award className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      plan.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/ {plan.durationMonths} Months</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 border-t mt-6">
                <button
                  onClick={() => openEditModal(plan)}
                  className="flex-1 py-2 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => toggleStatus(plan)}
                  className={`p-2 border rounded-lg transition-colors ${
                    plan.status === 'active'
                      ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/30'
                      : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                  }`}
                  title={plan.status === 'active' ? 'Deactivate Package' : 'Activate Package'}
                >
                  {plan.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeletePlan(plan._id)}
                  className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete Package"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Plan Modal */}
      <ResponsiveModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Membership Plan"
        maxWidthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 h-11 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-plan-form"
              disabled={adding}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {adding ? 'Creating Plan...' : 'Save Plan'}
            </button>
          </>
        }
      >
        <form id="add-plan-form" onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3 Months Premium Strength"
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Months)</label>
            <input
              type="number"
              required
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Pricing (₹)</label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </ResponsiveModal>

      {/* Edit Plan Modal */}
      <ResponsiveModal
        isOpen={showEditModal && !!selectedPlan}
        onClose={() => setShowEditModal(false)}
        title="Edit Membership Plan"
        maxWidthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 h-11 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-plan-form"
              disabled={updating}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-plan-form" onSubmit={handleEditPlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Title</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Months)</label>
            <input
              type="number"
              required
              value={editDurationMonths}
              onChange={(e) => setEditDurationMonths(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan Pricing (₹)</label>
            <input
              type="number"
              required
              value={editPrice}
              onChange={(e) => setEditPrice(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
};
