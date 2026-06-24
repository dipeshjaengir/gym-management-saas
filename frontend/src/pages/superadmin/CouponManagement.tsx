import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Plus, Trash2, Edit2, X, Tag, Check, Calendar, Users } from 'lucide-react';

interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  expiryDate: string;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
}

export const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [isActive, setIsActive] = useState(true);
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(10);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editUsageLimit, setEditUsageLimit] = useState<number>(100);
  const [editIsActive, setEditIsActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCoupons();
    // Default expiry date to 1 month from now
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setExpiryDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/coupons');
      setCoupons(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching coupons list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue || !expiryDate) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setAdding(true);
    try {
      await api.post('/superadmin/coupons', {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expiryDate: new Date(expiryDate).toISOString(),
        usageLimit,
        isActive
      });
      showToast('Coupon created successfully.', 'success');
      setShowAddModal(false);
      resetForm();
      loadCoupons();
    } catch (err: any) {
      showToast(err.message || 'Error creating coupon.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoupon) return;

    setUpdating(true);
    try {
      await api.put(`/superadmin/coupons/${selectedCoupon._id}`, {
        code: editCode.toUpperCase(),
        discountType: editDiscountType,
        discountValue: editDiscountValue,
        expiryDate: new Date(editExpiryDate).toISOString(),
        usageLimit: editUsageLimit,
        isActive: editIsActive
      });
      showToast('Coupon updated successfully.', 'success');
      setShowEditModal(false);
      loadCoupons();
    } catch (err: any) {
      showToast(err.message || 'Error updating coupon.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    try {
      const nextActive = !coupon.isActive;
      await api.put(`/superadmin/coupons/${coupon._id}`, { isActive: nextActive });
      showToast(`Coupon status toggled successfully.`, 'success');
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: nextActive } : c));
    } catch (err: any) {
      showToast(err.message || 'Error updating status.', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon code? This cannot be undone.')) return;

    try {
      await api.delete(`/superadmin/coupons/${id}`);
      showToast('Coupon deleted successfully.', 'success');
      setCoupons(prev => prev.filter(c => c._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete coupon.', 'error');
    }
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue(10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setExpiryDate(nextMonth.toISOString().split('T')[0]);
    setUsageLimit(100);
    setIsActive(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setEditCode(coupon.code);
    setEditDiscountType(coupon.discountType);
    setEditDiscountValue(coupon.discountValue);
    setEditExpiryDate(new Date(coupon.expiryDate).toISOString().split('T')[0]);
    setEditUsageLimit(coupon.usageLimit);
    setEditIsActive(coupon.isActive);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupon Management</h1>
          <p className="text-xs text-muted-foreground">Create and manage discount codes for membership plans.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No coupons created yet. Click "Create Coupon" to begin.</p>
        </div>
      ) : (
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {coupons.map((c) => (
              <div key={c._id} className="p-4 rounded-2xl bg-card border space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-bold text-base text-foreground">{c.code}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      c.isActive
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div>Discount: <span className="text-foreground font-semibold">{c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}</span></div>
                  <div>Expiry: <span className="text-foreground">{new Date(c.expiryDate).toLocaleDateString('en-IN')}</span></div>
                  <div>Limit: <span className="text-foreground">{c.timesUsed} / {c.usageLimit === 0 ? 'Unlimited' : c.usageLimit} used</span></div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => openEditModal(c)}
                    className="flex-grow py-2 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleCouponStatus(c)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      c.isActive ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/25' : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/25'
                    }`}
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(c._id)}
                    className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Coupon Code</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Discount Value</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Expiry Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Usage Details</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <Tag className="w-4 h-4 text-primary" />
                        <span>{c.code}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-primary">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium">
                      {new Date(c.expiryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 text-xs">
                      <div>Times Used: <span className="font-semibold text-foreground">{c.timesUsed}</span></div>
                      <div className="text-muted-foreground">Limit: {c.usageLimit === 0 ? 'Unlimited' : `${c.usageLimit} uses`}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          c.isActive
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleCouponStatus(c)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                          c.isActive
                            ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/25'
                            : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/25'
                        }`}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(c._id)}
                        className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Coupon"
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

      {/* Add Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Create New Coupon</h2>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER25"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Price (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Usage Limit</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    placeholder="0 = unlimited"
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border bg-background text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="isActiveCheck" className="text-sm font-semibold text-muted-foreground">Make active immediately</label>
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
                  {adding ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {showEditModal && selectedCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Coupon</h2>

            <form onSubmit={handleEditCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Discount Type</label>
                  <select
                    value={editDiscountType}
                    onChange={(e) => setEditDiscountType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Price (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Usage Limit</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editUsageLimit}
                    onChange={(e) => setEditUsageLimit(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActiveCheck"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border bg-background text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="editIsActiveCheck" className="text-sm font-semibold text-muted-foreground">Make Active</label>
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
