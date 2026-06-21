import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { UserCheck, Plus, Trash2, Edit3, X, Play, Pause, PhoneCall } from 'lucide-react';

interface Trainer {
  _id: string;
  name: string;
  phone: string;
  specialization: string;
  status: 'active' | 'inactive';
}

export const TrainerManagement: React.FC = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/trainers');
      setTrainers(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading trainers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('Name and Phone number are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await api.post('/trainers', {
        name,
        phone,
        specialization,
        status
      });
      showToast('Trainer registered successfully!', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadTrainers();
    } catch (err: any) {
      showToast(err.message || 'Failed to register trainer.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEditTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    setUpdating(true);
    try {
      await api.put(`/trainers/${selectedTrainer._id}`, {
        name: editName,
        phone: editPhone,
        specialization: editSpecialization,
        status: editStatus
      });
      showToast('Trainer details updated.', 'success');
      setShowEditModal(false);
      loadTrainers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update trainer details.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTrainer = async (id: string) => {
    if (!window.confirm('Delete trainer record?')) return;
    try {
      await api.delete(`/trainers/${id}`);
      showToast('Trainer deleted.', 'success');
      setTrainers(prev => prev.filter(t => t._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete trainer.', 'error');
    }
  };

  const toggleTrainerStatus = async (trainer: Trainer) => {
    const nextStatus = trainer.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/trainers/${trainer._id}`, { status: nextStatus });
      showToast(`Trainer status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setTrainers(prev => prev.map(t => t._id === trainer._id ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      showToast(err.message || 'Error updating status.', 'error');
    }
  };

  const resetAddForm = () => {
    setName('');
    setPhone('');
    setSpecialization('');
    setStatus('active');
  };

  const openEditModal = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setEditName(trainer.name);
    setEditPhone(trainer.phone);
    setEditSpecialization(trainer.specialization);
    setEditStatus(trainer.status);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trainer Registry</h1>
          <p className="text-xs text-muted-foreground">Manage personal trainers, specialists, and scheduling roster.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Trainer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : trainers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No trainers registered yet. Click "Add Trainer" to start building your roster.</p>
        </div>
      ) : (
        /* Mobile-First Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((trainer) => (
            <div
              key={trainer._id}
              className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all duration-300 relative flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      trainer.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {trainer.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-foreground">{trainer.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium">Phone: {trainer.phone}</p>
                  <p className="text-xs text-primary font-semibold tracking-wide uppercase pt-1">
                    {trainer.specialization || 'General Trainer'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-6 border-t mt-6">
                <button
                  onClick={() => openEditModal(trainer)}
                  className="flex-1 py-2 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => toggleTrainerStatus(trainer)}
                  className={`p-2 border rounded-lg transition-colors ${
                    trainer.status === 'active'
                      ? 'text-rose-400 hover:bg-rose-500/10 border-rose-500/30'
                      : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30'
                  }`}
                  title={trainer.status === 'active' ? 'Deactivate Trainer' : 'Activate Trainer'}
                >
                  {trainer.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeleteTrainer(trainer._id)}
                  className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Delete Trainer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register Trainer</h2>

            <form onSubmit={handleCreateTrainer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karan Dev"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 97777 97777"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Specialization / Expertise</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Bodybuilding, Yoga, CrossFit"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Roster Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {adding ? 'Saving...' : 'Register Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trainer Modal */}
      {showEditModal && selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Trainer Profile</h2>

            <form onSubmit={handleEditTrainer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Specialization</label>
                <input
                  type="text"
                  value={editSpecialization}
                  onChange={(e) => setEditSpecialization(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
    </div>
  );
};
