import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  QrCode,
  Scale,
  Activity,
  UserCheck,
  TrendingUp,
  Printer
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateMemberCardPDF, exportToExcel } from '../../utils/exportHelpers';

interface Plan {
  _id: string;
  name: string;
  price: number;
}

interface Member {
  _id: string;
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  height: number;
  weight: number;
  address: string;
  planId: Plan | null;
  membershipStart: string;
  membershipEnd: string;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  qrCode: string;
  status: 'active' | 'expired';
  emergencyContact?: string;
  notes?: string;
}

interface ProgressLog {
  _id: string;
  weight: number;
  bmi: number;
  chest: number;
  waist: number;
  biceps: number;
  date: string;
}

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { showToast } = useNotification();
  const { user } = useAuth();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState('');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [initialPayment, setInitialPayment] = useState<number>(0);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit Modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editDob, setEditDob] = useState('');
  const [editHeight, setEditHeight] = useState<number>(175);
  const [editWeight, setEditWeight] = useState<number>(70);
  const [editAddress, setEditAddress] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editMembershipStart, setEditMembershipStart] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editEmergency, setEditEmergency] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Detail Drawer / Progress Dashboard
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [logWeight, setLogWeight] = useState<number>(70);
  const [logChest, setLogChest] = useState<number>(0);
  const [logWaist, setLogWaist] = useState<number>(0);
  const [logBiceps, setLogBiceps] = useState<number>(0);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    try {
      const [membersData, plansData] = await Promise.all([
        api.get('/members'),
        api.get('/plans')
      ]);
      setMembers(membersData);
      setPlans(plansData);
      if (plansData.length > 0) {
        setPlanId(plansData[0]._id);
        setInitialPayment(plansData[0].price);
      }
    } catch (err: any) {
      showToast(err.message || 'Error retrieving member roster.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !planId) {
      showToast('Name, Phone, Email and Membership plan are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await api.post('/members', {
        name,
        phone,
        email,
        gender,
        dob,
        height,
        weight,
        address,
        planId,
        membershipStart,
        amountPaid: initialPayment,
        emergencyContact,
        notes
      });
      showToast('Member registered successfully!', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to register member.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setUpdating(true);
    try {
      await api.put(`/members/${selectedMember._id}`, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
        dob: editDob,
        height: editHeight,
        weight: editWeight,
        address: editAddress,
        planId: editPlanId,
        membershipStart: editMembershipStart,
        amountPaid: editAmountPaid,
        emergencyContact: editEmergency,
        notes: editNotes
      });
      showToast('Member profile updated.', 'success');
      setShowEditModal(false);
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update member profile.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Delete member? This soft-deletes their profile.')) return;
    try {
      await api.delete(`/members/${id}`);
      showToast('Member profile deleted.', 'success');
      setMembers(prev => prev.filter(m => m._id !== id));
      if (detailMember?._id === id) setShowDrawer(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete member.', 'error');
    }
  };

  const loadProgressLogs = async (memberId: string) => {
    try {
      const logs = await api.get(`/members/${memberId}/progress`);
      setProgressLogs(logs);
    } catch (err: any) {
      showToast('Error loading progress history.', 'error');
    }
  };

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailMember) return;
    setSavingProgress(true);
    try {
      await api.post(`/members/${detailMember._id}/progress`, {
        weight: logWeight,
        chest: logChest,
        waist: logWaist,
        biceps: logBiceps
      });
      showToast('Weight progress parameter logged.', 'success');
      loadProgressLogs(detailMember._id);
      loadMembersData(); // Reload weights in lists
    } catch (err: any) {
      showToast('Failed to log weight progress.', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const resetAddForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setGender('male');
    setDob('');
    setHeight(175);
    setWeight(70);
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    if (plans.length > 0) {
      setPlanId(plans[0]._id);
      setInitialPayment(plans[0].price);
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditGender(member.gender);
    setEditDob(member.dob ? member.dob.split('T')[0] : '');
    setEditHeight(member.height);
    setEditWeight(member.weight);
    setEditAddress(member.address);
    setEditPlanId(member.planId?._id || '');
    setEditMembershipStart(member.membershipStart ? member.membershipStart.split('T')[0] : '');
    setEditAmountPaid(member.amountPaid);
    setEditEmergency(member.emergencyContact || '');
    setEditNotes(member.notes || '');
    setShowEditModal(true);
  };

  const openDetailDrawer = (member: Member) => {
    setDetailMember(member);
    setLogWeight(member.weight);
    setLogChest(0);
    setLogWaist(0);
    setLogBiceps(0);
    loadProgressLogs(member._id);
    setShowDrawer(true);
  };

  const calculateBMI = (hCm: number, wKg: number) => {
    const hM = hCm / 100;
    return parseFloat((wKg / (hM * hM)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  };

  const handlePrintCard = () => {
    if (detailMember) {
      const gymName = user?.branding?.gymName || user?.gymName || 'Iron Forge';
      generateMemberCardPDF(detailMember, gymName);
    }
  };

  const handleExportExcel = () => {
    const formatted = filteredMembers.map((m) => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isExpired = new Date(m.membershipEnd) < todayStart;
      return {
        'Full Name': m.name,
        'Phone Number': m.phone,
        'Email Address': m.email || 'N/A',
        'Gender': m.gender.toUpperCase(),
        'Height (cm)': m.height,
        'Weight (kg)': m.weight,
        'Plan Name': m.planId?.name || 'Deleted Plan',
        'Start Date': new Date(m.membershipStart).toLocaleDateString('en-IN'),
        'Expiry Date': new Date(m.membershipEnd).toLocaleDateString('en-IN'),
        'Outstanding Dues (INR)': m.remainingAmount,
        'Membership Status': !isExpired ? 'Active' : 'Expired',
        'Access QR Code': m.qrCode
      };
    });
    exportToExcel(formatted, 'members_roster_report', 'Members');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isExpired = new Date(m.membershipEnd) < todayStart;

    if (filterStatus === 'active') return matchesSearch && !isExpired;
    if (filterStatus === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members Directory</h1>
          <p className="text-xs text-muted-foreground">Manage active memberships, weight diagnostics, and QR passes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm flex-1 sm:flex-none"
          >
            Export Excel
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" /> Register Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or contact number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
        >
          <option value="all">All Members</option>
          <option value="active">Active Members</option>
          <option value="expired">Expired Members</option>
        </select>
      </div>

      {/* List content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground font-semibold">No members registered matching filters.</p>
        </div>
      ) : (
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredMembers.map((member) => {
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isExpired = new Date(member.membershipEnd) < todayStart;
              return (
                <div key={member._id} className="p-4 rounded-xl bg-card border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{member.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        !isExpired
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {!isExpired ? 'Active' : 'Expired'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Phone: <span className="text-foreground">{member.phone}</span></div>
                    <div>Plan: <span className="text-foreground">{member.planId?.name || 'Deleted Plan'}</span></div>
                    <div>Remaining: <span className="text-rose-400 font-bold">₹{member.remainingAmount}</span></div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => openDetailDrawer(member)}
                      className="flex-1 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" /> Open Profile
                    </button>
                    <button
                      onClick={() => openEditModal(member)}
                      className="p-2 border hover:bg-muted text-foreground rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member._id)}
                      className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Contact Info</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Active Plan</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Dues / Expiry</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredMembers.map((member) => {
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isExpired = new Date(member.membershipEnd) < todayStart;
                  return (
                    <tr key={member._id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.gender} | Weight: {member.weight}kg</div>
                      </td>
                      <td className="p-4">
                        <div>{member.phone}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </td>
                      <td className="p-4 font-semibold text-primary">{member.planId?.name || 'Deleted Plan'}</td>
                      <td className="p-4">
                        <div className="font-bold text-rose-400">₹{member.remainingAmount} Balance</div>
                        <div className="text-xs text-muted-foreground">Expires {new Date(member.membershipEnd).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            !isExpired
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {!isExpired ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailDrawer(member)}
                          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Activity className="w-3.5 h-3.5" /> Profile
                        </button>
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member._id)}
                          className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register New Member</h2>

            <form onSubmit={handleRegisterMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohan Khanna"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 91111 91111"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address Location</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street and Area details..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => {
                      setPlanId(e.target.value);
                      const planObj = plans.find((p) => p._id === e.target.value);
                      if (planObj) setInitialPayment(planObj.price);
                    }}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={membershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Deposit Collected (₹)</label>
                  <input
                    type="number"
                    required
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Guardian Phone..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Medical conditions, goals..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
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
                  {adding ? 'Registering...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Member Profile</h2>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={editHeight}
                    onChange={(e) => setEditHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Active Plan</label>
                  <select
                    value={editPlanId}
                    onChange={(e) => setEditPlanId(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editMembershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Dues Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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

      {/* Member Detail Drawer */}
      {showDrawer && detailMember && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l shadow-2xl flex flex-col justify-between transform transition-all duration-300 animate-slide-over">
          {/* Drawer Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-extrabold text-base text-foreground">Member Wellness &amp; Pass</h2>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Digital Pass */}
            <div className="p-6 rounded-2xl bg-background border space-y-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div id="pass-card-area" className="w-full max-w-xs p-5 bg-card border rounded-2xl flex flex-col items-center text-center space-y-3 relative shadow">
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Gym Entry Pass
                </span>
                
                {/* QR server generated QR code */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center border shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${detailMember.qrCode}`}
                    alt="Member QR Pass"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div>
                  <div className="font-extrabold text-sm">{detailMember.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{detailMember.qrCode}</div>
                </div>

                <div className="w-full border-t border-dashed pt-2.5 text-[10px] text-muted-foreground">
                  Gym Studio: <span className="font-bold text-foreground">{user?.branding?.gymName || user?.gymName || 'Iron Forge'}</span>
                </div>
              </div>

              <button
                onClick={handlePrintCard}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Print QR Pass
              </button>
            </div>

            {/* 2. BMI diagnostics */}
            <div className="p-5 rounded-2xl bg-background border space-y-3">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Scale className="w-4 h-4 text-primary" /> BMI Wellness Diagnostics
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">BMI Score</span>
                  <span className="text-xl font-bold text-foreground">
                    {calculateBMI(detailMember.height, detailMember.weight)}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">Classification</span>
                  <span className={`text-xl font-bold ${getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).color}`}>
                    {getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).label}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Weight logger */}
            <div className="p-5 rounded-2xl bg-background border space-y-4">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" /> Log Weight Progress
              </h3>

              <form onSubmit={handleLogProgress} className="flex gap-2">
                <input
                  type="number"
                  required
                  value={logWeight}
                  onChange={(e) => setLogWeight(Number(e.target.value))}
                  placeholder="New Weight (kg)"
                  className="flex-grow px-3 py-1.5 rounded-lg border bg-card text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingProgress}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-lg transition-all"
                >
                  {savingProgress ? 'Logging...' : 'Save Log'}
                </button>
              </form>
            </div>

            {/* 4. Weight history charts */}
            {progressLogs.length > 0 && (
              <div className="p-5 rounded-2xl bg-background border space-y-3">
                <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Activity className="w-4 h-4 text-primary" /> Weight History Trend
                </h3>

                <div className="w-full h-44 text-xs font-sans mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressLogs}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        stroke="#888888"
                      />
                      <YAxis domain={['auto', 'auto']} stroke="#888888" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
