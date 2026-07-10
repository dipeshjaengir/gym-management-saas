import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { generateReceiptPDF } from '../../utils/exportHelpers';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Scale,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Printer,
  Activity,
  Plus,
  FileText,
  Check,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  QrCode,
  Dumbbell,
  Utensils,
  RefreshCw,
  IndianRupee,
  Database
} from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  price: number;
  durationMonths: number;
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
  joiningDate: string;
  planId: Plan | null;
  membershipStart: string;
  membershipEnd: string;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  qrCode: string;
  emergencyContact?: string;
  notes?: string;
  isArchived: boolean;
  lastPaymentDate?: string;
  bmi?: number;
  isMigrated?: boolean;
  migrationMethod?: 'excel' | 'manual';
  openingBalance?: number;
  discount?: number;
  previousOutstanding?: number;
}

interface Payment {
  _id: string;
  amount: number;
  pendingAmount: number;
  paymentDate: string;
  paymentMethod: 'upi' | 'cash' | 'card' | 'bank_transfer';
  receiptNumber: string;
  notes: string;
  operatorName?: string;
  isVoided?: boolean;
  originalAmount?: number;
  updatedAmount?: number;
  updatedBy?: string;
  updatedDate?: string;
}

interface AttendanceLog {
  _id: string;
  date: string;
  checkInTime: string;
  status: 'present' | 'absent';
}

interface WorkoutPlan {
  _id: string;
  instructions: string;
  exercises: { day: string; name: string; sets: number; reps: string }[];
}

interface DietPlan {
  _id: string;
  instructions: string;
  meals: { time: string; items: string; calories: number }[];
}

const calculateBMI = (hCm: number, wKg: number) => {
  if (hCm <= 0) return 0;
  const hM = hCm / 100;
  return parseFloat((wKg / (hM * hM)).toFixed(1));
};

const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20' };
  if (bmi < 25) return { label: 'Normal', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' };
  if (bmi < 30) return { label: 'Overweight', color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' };
  return { label: 'Obese', color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' };
};

export const MemberProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { user } = useAuth();
  const isSuspended = user?.status === 'suspended' || user?.subscription?.status === 'suspended' || user?.subscription?.status === 'expired';

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Collect Due Modal
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectMethod, setCollectMethod] = useState<'upi' | 'cash' | 'card' | 'bank_transfer'>('cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectStep, setCollectStep] = useState(1);

  // WhatsApp Status Modal
  const [whatsAppModal, setWhatsAppModal] = useState<{
    show: boolean;
    url: string;
    sentClicked: boolean;
  }>({ show: false, url: '', sentClicked: false });

  // Edit Payment Modal
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number>(0);
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // View Receipt Modal
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'payments' | 'attendance' | 'workout' | 'diet' | 'timeline'>('payments');
  const [timeline, setTimeline] = useState<any[]>([]);

  // Renewal Modal States
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [gymPlans, setGymPlans] = useState<any[]>([]);
  const [loadingGymPlans, setLoadingGymPlans] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [renewJoiningDate, setRenewJoiningDate] = useState('');
  const [renewStartDate, setRenewStartDate] = useState('');
  const [renewExpiryDate, setRenewExpiryDate] = useState('');
  const [renewPlanPrice, setRenewPlanPrice] = useState<number>(0);
  const [renewDiscount, setRenewDiscount] = useState<number | ''>('');
  const [renewAmountPaid, setRenewAmountPaid] = useState<number>(0);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<'upi' | 'cash' | 'card' | 'bank_transfer'>('cash');
  const [renewRemarks, setRenewRemarks] = useState('');
  const [renewing, setRenewing] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (id) {
      loadProfileData();
    }
  }, [id]);

  useEffect(() => {
    if (member && gymPlans.length > 0 && location.search.includes('renew=true')) {
      handleOpenRenewModal();
      // Remove query parameter so it doesn't reopen on subsequent renders
      navigate(location.pathname, { replace: true });
    }
  }, [member, gymPlans, location.search]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [mRes, payRes, attRes, wkRes, dtRes, timelineRes, plansRes] = await Promise.all([
        api.get(`/members/${id}`),
        api.get(`/payments/member/${id}`),
        api.get(`/attendance/member/${id}`).catch(() => []),
        api.get(`/workouts/member/${id}`).catch(() => null),
        api.get(`/diets/member/${id}`).catch(() => null),
        api.get(`/members/${id}/timeline`).catch(() => []),
        api.get('/plans').catch(() => [])
      ]);

      setMember(mRes);
      setPayments(payRes);
      setAttendance(attRes);
      setWorkout(wkRes);
      setDiet(dtRes);
      setTimeline(timelineRes);
      setGymPlans(plansRes.filter((p: any) => p.status === 'active' && !p.isDeleted));
    } catch (err: any) {
      showToast(err.message || 'Error loading member profile details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenewModal = () => {
    if (!member) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currentExpiry = member.membershipEnd ? new Date(member.membershipEnd) : null;
    
    let defaultStart = today;
    if (currentExpiry && currentExpiry.getTime() > Date.now()) {
      const nextDay = new Date(currentExpiry);
      nextDay.setDate(nextDay.getDate() + 1);
      defaultStart = nextDay.toISOString().split('T')[0];
    }
    
    setRenewJoiningDate(member.joiningDate ? member.joiningDate.split('T')[0] : today);
    setRenewStartDate(defaultStart);
    
    const matchedPlan = gymPlans.find(p => p._id === member.planId?._id);
    if (matchedPlan) {
      setSelectedPlanId(matchedPlan._id);
      setRenewPlanPrice(matchedPlan.price);
      setRenewDiscount('');
      setRenewAmountPaid(matchedPlan.price);
      
      const expDate = new Date(defaultStart);
      expDate.setMonth(expDate.getMonth() + matchedPlan.durationMonths);
      setRenewExpiryDate(expDate.toISOString().split('T')[0]);
    } else {
      setSelectedPlanId('');
      setRenewPlanPrice(0);
      setRenewDiscount('');
      setRenewAmountPaid(0);
      setRenewExpiryDate(defaultStart);
    }
    
    setRenewRemarks('');
    setShowRenewModal(true);
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = gymPlans.find(p => p._id === planId);
    if (plan) {
      setRenewPlanPrice(plan.price);
      setRenewDiscount('');
      setRenewAmountPaid(plan.price);
      
      const baseDate = renewStartDate ? new Date(renewStartDate) : new Date();
      baseDate.setMonth(baseDate.getMonth() + plan.durationMonths);
      setRenewExpiryDate(baseDate.toISOString().split('T')[0]);
    } else {
      setRenewPlanPrice(0);
      setRenewDiscount('');
      setRenewAmountPaid(0);
    }
  };

  const handleStartDateChange = (dateVal: string) => {
    setRenewStartDate(dateVal);
    const plan = gymPlans.find(p => p._id === selectedPlanId);
    if (plan && dateVal) {
      const baseDate = new Date(dateVal);
      baseDate.setMonth(baseDate.getMonth() + plan.durationMonths);
      setRenewExpiryDate(baseDate.toISOString().split('T')[0]);
    }
  };

  const renewRemainingDue = Math.max(0, renewPlanPrice - Number(renewDiscount || 0) - renewAmountPaid);

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !renewStartDate || !renewExpiryDate) {
      showToast('Please select a plan and valid dates.', 'error');
      return;
    }
    if (isSuspended) {
      showToast('Write operations are disabled.', 'error');
      return;
    }

    setRenewing(true);
    try {
      const res = await api.post(`/members/${id}/renew`, {
        newPlanId: selectedPlanId,
        joiningDate: renewJoiningDate,
        membershipStart: renewStartDate,
        membershipEnd: renewExpiryDate,
        planPrice: renewPlanPrice,
        discount: Number(renewDiscount || 0),
        amountPaid: renewAmountPaid,
        remainingDue: renewRemainingDue,
        paymentMethod: renewPaymentMethod,
        remarks: renewRemarks
      });

      showToast('Membership successfully renewed!', 'success');
      setShowRenewModal(false);
      
      await loadProfileData();

      if (res.whatsappUrl) {
        setWhatsAppModal({ show: true, url: res.whatsappUrl, sentClicked: false });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to renew membership.', 'error');
    } finally {
      setRenewing(false);
    }
  };

  const downloadQRBadge = async () => {
    if (!member) return;
    const badgeElement = document.getElementById('member-qr-badge');
    if (!badgeElement) return;

    try {
      showToast('Generating print-ready PDF badge...', 'info');
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(badgeElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0a'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [85, 120]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 85, 120);
      pdf.save(`badge-${member.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      showToast('Badge PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Failed to download PDF badge.', 'error');
    }
  };

  const handleCollectDues = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSuspended) {
      showToast('Write operational changes blocked for suspended accounts.', 'error');
      return;
    }
    if (Number(collectAmount) <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    const totalDue = member ? (member.remainingAmount + (member.previousOutstanding || 0)) : 0;
    if (member && Number(collectAmount) > totalDue) {
      showToast('Payment amount exceeds outstanding dues balance.', 'error');
      return;
    }

    setCollecting(true);
    try {
      const res = await api.post('/payments', {
        memberId: id,
        amount: collectAmount,
        paymentMethod: collectMethod,
        notes: collectNotes || 'Dues Settlement Collection'
      });

      showToast('Payment collected successfully!', 'success');
      setShowCollectModal(false);
      setCollectNotes('');
      
      // Reload profile data
      await loadProfileData();

      // Trigger WhatsApp Status popover
      if (res.whatsappUrl) {
        setWhatsAppModal({
          show: true,
          url: res.whatsappUrl,
          sentClicked: false
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing dues collection.', 'error');
    } finally {
      setCollecting(false);
    }
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;
    if (isSuspended) {
      showToast('Write operations are disabled.', 'error');
      return;
    }
    if (editPaymentAmount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }

    setUpdatingPayment(true);
    try {
      await api.put(`/payments/${editPayment._id}/edit`, {
        amount: editPaymentAmount,
        notes: editPaymentNotes
      });
      showToast('Transaction ledger record updated successfully.', 'success');
      setShowEditPaymentModal(false);
      setEditPayment(null);
      loadProfileData();
    } catch (err: any) {
      showToast(err.message || 'Error updating transaction.', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleVoidPayment = async (payId: string) => {
    if (isSuspended) {
      showToast('Write operations are disabled.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to VOID this payment receipt? This will deduct the amount from member paid balance and restore their dues.')) return;

    try {
      await api.put(`/payments/${payId}/void`, {});
      showToast('Payment transaction voided successfully.', 'success');
      loadProfileData();
    } catch (err: any) {
      showToast(err.message || 'Error voiding transaction.', 'error');
    }
  };

  const handleArchiveProfile = async () => {
    if (isSuspended) {
      showToast('Write operations are disabled.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to archive this member? All metrics and billing histories remain saved.')) return;

    try {
      await api.delete(`/members/${id}`);
      showToast('Member profile archived successfully.', 'success');
      loadProfileData();
    } catch (err: any) {
      showToast(err.message || 'Error archiving profile.', 'error');
    }
  };

  const handleRestoreProfile = async () => {
    if (isSuspended) {
      showToast('Write operations are disabled.', 'error');
      return;
    }
    try {
      await api.put(`/members/${id}/restore`, {});
      showToast('Member profile restored successfully.', 'success');
      loadProfileData();
    } catch (err: any) {
      showToast(err.message || 'Error restoring profile.', 'error');
    }
  };

  const openViewReceipt = async (payId: string) => {
    setLoadingReceipt(true);
    setShowReceiptModal(true);
    try {
      const details = await api.get(`/payments/${payId}/receipt`);
      setReceiptDetails(details);
    } catch (err: any) {
      showToast('Error loading receipt data.', 'error');
      setShowReceiptModal(false);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const downloadReceiptPDF = () => {
    if (receiptDetails) {
      generateReceiptPDF(receiptDetails);
    }
  };

  // Activity Timeline Builder
  const buildTimeline = () => {
    if (!member) return [];
    const timeline: { date: Date; title: string; desc: string; type: 'info' | 'success' | 'warn'; details?: any }[] = [];

    // Onboarding (Registration Date)
    timeline.push({
      date: new Date(member.joiningDate),
      title: 'Registration Date',
      desc: `Profile registered in studio workspace. Assigned Plan: ${member.planId?.name || 'N/A'}.`,
      type: 'info',
      details: {
        memberName: member.name,
        notes: member.notes || 'Profile created successfully'
      }
    });

    // Payments
    payments.forEach(p => {
      let eventType = 'Payment Collected';
      if (p.notes?.includes('Initial Plan Registration') || p.notes?.includes('Initial payment') || p.notes?.includes('Initial Plan Registration Payment')) {
        eventType = 'Initial Membership Purchase';
      } else if (p.notes?.includes('Dues Settlement') || p.notes?.includes('Collect Remaining') || p.notes?.includes('settlement') || p.notes?.includes('installment')) {
        eventType = 'Due Collection';
      } else if (p.notes?.includes('Renewal') || p.notes?.includes('Membership Renewal')) {
        eventType = 'Membership Renewal';
      } else if (p.notes?.includes('Upgrade') || p.notes?.includes('Plan Upgrade')) {
        eventType = 'Plan Upgrade';
      } else if (p.notes?.includes('Downgrade') || p.notes?.includes('Plan Downgrade')) {
        eventType = 'Plan Downgrade';
      } else if (p.pendingAmount > 0) {
        eventType = 'Partial Payment';
      }

      if (p.isVoided) {
        timeline.push({
          date: new Date(p.paymentDate),
          title: `Voided: ${eventType}`,
          desc: `Receipt ID: ${p.receiptNumber} voided. Deducted ₹${p.amount} from member paid balance.`,
          type: 'warn',
          details: {
            transactionId: p.receiptNumber,
            memberName: member.name,
            amount: p.amount,
            method: p.paymentMethod,
            collectedBy: p.operatorName || 'Admin',
            notes: `VOIDED - ${p.notes || 'N/A'}`
          }
        });
      } else {
        timeline.push({
          date: new Date(p.paymentDate),
          title: eventType,
          desc: `Transaction receipt ${p.receiptNumber} logged. Amount: ₹${p.amount} via ${p.paymentMethod.toUpperCase()}`,
          type: 'success',
          details: {
            transactionId: p.receiptNumber,
            memberName: member.name,
            amount: p.amount,
            method: p.paymentMethod,
            collectedBy: p.operatorName || 'Admin',
            notes: p.notes || 'N/A'
          }
        });
      }
    });

    // Sort newest first
    return timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-4 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center bg-card border rounded-2xl">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Member Not Found</h2>
        <p className="text-sm text-muted-foreground mt-2">The requested member file was not found or has been permanently removed.</p>
        <button onClick={() => navigate('/app/members')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold">
          Return to Directory
        </button>
      </div>
    );
  }

  const timelineItems = buildTimeline();

  return (
    <div className="space-y-6 font-sans text-foreground">
      {/* Top Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/members')}
          className="p-2 border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
          <p className="text-xs text-muted-foreground">Gym Member Profile &amp; Transactions Timeline</p>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Member Card & Stats */}
        <div className="space-y-6 lg:col-span-1">
          {/* Main Info Card */}
          <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            {/* Background highlight */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{member.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    member.isArchived 
                      ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/25'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/25'
                  }`}>
                    {member.isArchived ? 'Archived File' : 'Active Member'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    member.isMigrated 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/25'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/25'
                  }`}>
                    {member.isMigrated ? '🔵 Migrated Member' : '🟢 Registered in GymLedger'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0 text-primary" />
                <span className="text-foreground">{member.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0 text-primary" />
                <span className="text-foreground">{member.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0 text-primary" />
                <span>DOB: <span className="text-foreground">{new Date(member.dob).toLocaleDateString('en-IN')}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Scale className="w-4 h-4 shrink-0 text-primary" />
                <span>Metrics: <span className="text-foreground">{member.height}cm / {member.weight}kg</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <span className="text-foreground truncate">{member.address || 'No Address Logged'}</span>
              </div>
              {member.height > 0 && member.weight > 0 && (() => {
                const bmiVal = calculateBMI(member.height, member.weight);
                const cat = getBMICategory(bmiVal);
                return (
                  <div className="p-3 bg-muted/40 dark:bg-muted/10 border border-border/50 rounded-xl mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">BMI Score</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                    </div>
                    <div className="text-xl font-black text-foreground mt-1">{bmiVal}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Healthy Range: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">18.5 - 24.9</span>
                    </div>
                  </div>
                );
              })()}
              {member.emergencyContact && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl mt-2">
                  <div className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Emergency Contact</div>
                  <div className="text-sm font-semibold mt-0.5 text-rose-900 dark:text-rose-200">{member.emergencyContact}</div>
                </div>
              )}
            </div>

            {!member.isArchived && !isSuspended && (
              <button
                onClick={handleOpenRenewModal}
                className="w-full py-2.5 mb-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Renew Membership Plan
              </button>
            )}

            <div className="pt-4 border-t flex gap-2">
              {member.isArchived ? (
                <button
                  onClick={handleRestoreProfile}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Restore Member
                </button>
              ) : (
                <button
                  onClick={handleArchiveProfile}
                  className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Archive Profile
                </button>
              )}
            </div>
          </div>

          {/* Membership Plan Info */}
          <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Membership Plan</h4>
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">{member.planId?.name || 'Deleted Plan'}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                  member.paymentStatus === 'paid'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                    : member.paymentStatus === 'partial'
                    ? 'bg-amber-950/40 text-amber-400 border-amber-500/25'
                    : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                }`}>
                  {member.paymentStatus.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="text-foreground font-medium">{new Date(member.membershipStart).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry Date:</span>
                  <span className="text-foreground font-medium">{new Date(member.membershipEnd).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Original Price:</span>
                <span className="font-semibold text-foreground">₹{member.planId?.price || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-semibold text-amber-500">₹{member.discount || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Final Payable:</span>
                <span className="font-semibold text-foreground">₹{(member.planId?.price || 0) - (member.discount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Paid (Current Plan):</span>
                <span className="font-semibold text-emerald-400">₹{member.amountPaid}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-border/30">
                <span className="text-muted-foreground">Current Plan Due:</span>
                <span className="font-semibold text-rose-400">₹{member.remainingAmount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Previous Outstanding:</span>
                <span className="font-semibold text-rose-400">₹{member.previousOutstanding || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t font-black">
                <span>Total Outstanding:</span>
                <span className={(member.remainingAmount + (member.previousOutstanding || 0)) > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  ₹{(member.previousOutstanding || 0) + member.remainingAmount}
                </span>
              </div>
            </div>

            {(member.remainingAmount + (member.previousOutstanding || 0)) > 0 && !isSuspended && (
              <button
                onClick={() => { setShowCollectModal(true); setCollectStep(1); }}
                className="w-full mt-2 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
              >
                <IndianRupee className="w-4 h-4" /> Collect Remaining ₹{(member.previousOutstanding || 0) + member.remainingAmount}
              </button>
            )}

            {!isSuspended && (
              <button
                onClick={handleOpenRenewModal}
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Renew Membership Plan
              </button>
            )}
          </div>

          {/* QR Receptionist Pass */}
          <div className="bg-card border rounded-3xl p-6 shadow-sm text-center space-y-4">
            <h4 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Receptionist QR Pass</h4>
            
            <div className="flex justify-center">
              <div
                id="member-qr-badge"
                className="w-[240px] h-[340px] bg-slate-950 border border-primary/20 rounded-2xl p-4 flex flex-col items-center justify-between text-white shadow-lg relative overflow-hidden"
              >
                <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-primary/10 blur-2xl" />
                <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-primary/10 blur-2xl" />

                <div className="text-center w-full mt-2 z-10">
                  <div className="text-[10px] font-bold text-primary tracking-widest uppercase">GYMLEDGER MEMBER</div>
                  <div className="text-sm font-black truncate max-w-full mt-0.5 text-slate-100">
                    {user?.branding?.gymName || user?.gymName || 'GymLedger Gym'}
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl inline-block border border-slate-800 shadow-inner z-10">
                  <div className="w-28 h-28 bg-white flex flex-col items-center justify-center gap-1.5 rounded-lg relative">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(member.qrCode)}`}
                      alt="Member QR Code Pass"
                      className="w-24 h-24 object-contain"
                    />
                    <span className="text-[8px] text-slate-500 font-mono font-bold tracking-wider mt-1">{member.qrCode}</span>
                  </div>
                </div>

                <div className="text-center w-full mb-2 z-10">
                  <div className="text-sm font-extrabold text-white truncate px-2">{member.name}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Plan: {member.planId?.name || 'General Membership'}</div>
                  <div className="text-[9px] text-rose-400 font-extrabold uppercase tracking-wide mt-1 bg-rose-500/10 px-2 py-0.5 rounded-full inline-block">
                    Expires: {new Date(member.membershipEnd).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={downloadQRBadge}
              className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs transition-all border flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Download Badge PDF
            </button>
            <p className="text-[10px] text-muted-foreground">Scanned at the gym entrance desk to verify active member access.</p>
          </div>
        </div>

        {/* Right Column: Ledger, Logs, Schedules & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-border overflow-x-auto pb-px">
            {(['payments', 'attendance', 'workout', 'diet', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'payments' && 'Payment Ledger'}
                {tab === 'attendance' && 'Attendance Logs'}
                {tab === 'workout' && 'Workout Schedule'}
                {tab === 'diet' && 'Diet Routine'}
                {tab === 'timeline' && 'Activity Timeline'}
              </button>
            ))}
          </div>

          {/* Dynamic Tab Contents */}
          <div className="space-y-6">
            {activeTab === 'payments' && (
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Transaction History Ledger</h3>
                  <span className="text-xs text-muted-foreground font-semibold">Total Receipts: {payments.length}</span>
                </div>

                {payments.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                    <p className="text-sm text-muted-foreground">No payments logged for this member yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase">
                          <th className="p-3">Receipt No</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Method</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Operator</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {payments.map((p) => (
                          <tr key={p._id} className={`hover:bg-muted/10 transition-colors ${p.isVoided ? 'opacity-40 line-through bg-rose-50/50 dark:bg-rose-950/10' : ''}`}>
                            <td className="p-3 font-mono font-semibold text-foreground">
                              {p.receiptNumber}
                              {p.isVoided && <span className="ml-1 text-[9px] text-rose-600 dark:text-rose-400 uppercase font-extrabold">(Voided)</span>}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              ₹{p.amount}
                              {p.originalAmount && (
                                <span className="block text-[9px] text-muted-foreground line-through font-normal">Orig: ₹{p.originalAmount}</span>
                              )}
                            </td>
                            <td className="p-3 uppercase font-medium">{p.paymentMethod}</td>
                            <td className="p-3 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                            <td className="p-3 text-muted-foreground font-medium">{p.operatorName || 'Admin'}</td>
                            <td className="p-3 text-right flex items-center justify-end gap-1">
                              <button
                                onClick={() => openViewReceipt(p._id)}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                                title="View details & Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!p.isVoided && !isSuspended && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditPayment(p);
                                      setEditPaymentAmount(p.amount);
                                      setEditPaymentNotes(p.notes || '');
                                      setShowEditPaymentModal(true);
                                    }}
                                    className="p-1 hover:bg-muted rounded text-primary hover:text-primary/95 cursor-pointer"
                                    title="Edit payment amount"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleVoidPayment(p._id)}
                                    className="p-1 hover:bg-muted rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    title="Void transaction"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold">Attendance Check-in Logs</h3>
                {attendance.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                    <p className="text-sm text-muted-foreground">No scans registered. Daily QR check-in will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase">
                          <th className="p-3">Log Date</th>
                          <th className="p-3">Check-in Time</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendance.map((log) => (
                          <tr key={log._id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 font-semibold text-foreground">{log.date}</td>
                            <td className="p-3 text-muted-foreground">{log.checkInTime}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 uppercase">
                                Present
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'workout' && (
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" /> Active Workout Routine
                  </h3>
                </div>

                {!workout || !workout.exercises || workout.exercises.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                    <p className="text-sm text-muted-foreground font-semibold">No exercise routine assigned.</p>
                    <p className="text-xs text-muted-foreground mt-1">Assign a routine via the Diet/Workout Planner tab.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workout.instructions && (
                      <div className="p-3.5 bg-muted/20 border rounded-2xl text-xs text-muted-foreground italic">
                        <strong>Dietitian Instructions:</strong> {workout.instructions}
                      </div>
                    )}
                    <div className="overflow-hidden border rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase">
                            <th className="p-3">Day</th>
                            <th className="p-3">Exercise Name</th>
                            <th className="p-3">Sets</th>
                            <th className="p-3">Reps / Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {workout.exercises.map((ex, idx) => (
                            <tr key={idx} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-bold uppercase text-primary">{ex.day}</td>
                              <td className="p-3 font-semibold">{ex.name}</td>
                              <td className="p-3">{ex.sets} Sets</td>
                              <td className="p-3 text-muted-foreground">{ex.reps}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diet' && (
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-primary" /> Nutrition &amp; Meals Schedule
                  </h3>
                </div>

                {!diet || !diet.meals || diet.meals.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                    <p className="text-sm text-muted-foreground font-semibold">No diet routine assigned.</p>
                    <p className="text-xs text-muted-foreground mt-1">Assign a plan via the Diet/Workout Planner tab.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {diet.instructions && (
                      <div className="p-3.5 bg-muted/20 border rounded-2xl text-xs text-muted-foreground italic">
                        <strong>General Instructions:</strong> {diet.instructions}
                      </div>
                    )}
                    <div className="overflow-hidden border rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase">
                            <th className="p-3">Meal Time</th>
                            <th className="p-3">Recommended Items</th>
                            <th className="p-3 text-right">Calories</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {diet.meals.map((m, idx) => (
                            <tr key={idx} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-bold text-primary">{m.time}</td>
                              <td className="p-3 font-semibold">{m.items}</td>
                              <td className="p-3 text-right text-muted-foreground">{m.calories} Kcal</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-border/40 pb-3">
                  <div>
                    <h3 className="text-lg font-bold">Member Activity Ledger</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Database-driven financial &amp; check-in history</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold bg-muted px-2.5 py-1 rounded-full">Total Entries: {timeline.length}</span>
                </div>

                {timeline.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl">
                    <p className="text-sm text-muted-foreground">No activity records logged for this member yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-border pl-6 ml-3 space-y-6 pt-2">
                    {timeline.map((item, idx) => {
                      // Color and icon coding
                      let bulletColor = 'bg-primary';
                      let actIcon = <Activity className="w-3.5 h-3.5 text-white" />;

                      if (item.activityType === 'registration') {
                        bulletColor = 'bg-emerald-500';
                        actIcon = <User className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType.startsWith('payment') || item.activityType === 'correction') {
                        bulletColor = 'bg-amber-500';
                        actIcon = <IndianRupee className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType === 'void' || item.activityType === 'refund') {
                        bulletColor = 'bg-rose-500';
                        actIcon = <XCircle className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType.startsWith('plan')) {
                        bulletColor = 'bg-purple-500';
                        actIcon = <RefreshCw className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType.startsWith('check_')) {
                        bulletColor = 'bg-sky-500';
                        actIcon = <Clock className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType.endsWith('_updated')) {
                        bulletColor = 'bg-indigo-500';
                        actIcon = <Dumbbell className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType === 'migration' || item.activityType === 'migration_updated' || item.activityType === 'migration_merged') {
                        bulletColor = 'bg-blue-500';
                        actIcon = <Database className="w-3.5 h-3.5 text-white" />;
                      } else if (item.activityType === 'opening_balance') {
                        bulletColor = 'bg-indigo-500';
                        actIcon = <IndianRupee className="w-3.5 h-3.5 text-white" />;
                      }

                      return (
                        <div key={item._id || idx} className="relative">
                          {/* Bullet Icon */}
                          <span className={`absolute -left-[35px] top-1 flex items-center justify-center w-7 h-7 rounded-full border-4 border-card shadow-sm ${bulletColor}`}>
                            {actIcon}
                          </span>
                          <div className="space-y-1 bg-muted/10 p-4 border border-border/40 rounded-2xl hover:bg-muted/20 transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-foreground">{item.title}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold bg-muted/40 px-2 py-0.5 rounded-full">
                                {item.date ? new Date(item.date).toLocaleDateString('en-IN') : ''} at {item.time}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.remarks}</p>

                            {/* Extra transaction info */}
                            {(item.receiptNumber || item.paymentMethod || item.remainingDue !== undefined || item.originalPrice !== undefined) && (
                              <div className="pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground font-medium space-y-1">
                                {item.originalPrice !== undefined ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground mb-1.5 p-2 bg-muted/20 border border-border/40 rounded-xl">
                                    <div>Original Price: <strong className="text-foreground">₹{item.originalPrice}</strong></div>
                                    <div>Discount: <strong className="text-amber-500 font-bold">₹{item.discount || 0}</strong></div>
                                    <div>Final Payable: <strong className="text-foreground">₹{item.finalPayable}</strong></div>
                                    <div>Amount Paid: <strong className="text-emerald-400 font-semibold">₹{item.newAmount || 0}</strong></div>
                                    <div>Previous Outstanding: <strong className="text-rose-400">₹{item.previousOutstanding || 0}</strong></div>
                                    <div>Current Due: <strong className="text-rose-400">₹{item.currentOutstanding || 0}</strong></div>
                                    <div className="col-span-2 font-bold text-[10px]">Total Outstanding: <strong className="text-rose-500 font-black">₹{item.totalOutstanding || 0}</strong></div>
                                  </div>
                                ) : null}
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  {item.receiptNumber && (
                                    <span>Receipt: <strong className="text-foreground font-mono">{item.receiptNumber}</strong></span>
                                  )}
                                  {item.paymentMethod && (
                                    <span className="uppercase">Method: <strong className="text-foreground">{item.paymentMethod}</strong></span>
                                  )}
                                  {item.remainingDue !== undefined && item.originalPrice === undefined && (
                                    <span>Outstanding Dues: <strong className="text-foreground">₹{item.remainingDue}</strong></span>
                                  )}
                                  <span>Operator: <strong className="text-foreground">{item.operator || 'Admin'}</strong></span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Renew Member Modal */}
      <ResponsiveModal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew Member Plan"
        subtitle={`Extend subscription packages for: ${member.name}`}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRenewModal(false)}
              className="flex-1 h-11 border border-muted hover:bg-muted text-foreground rounded-xl text-sm font-bold cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="renew-member-form"
              disabled={renewing}
              className="flex-1 h-11 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {renewing ? 'Renewing...' : 'Confirm Renewal'}
            </button>
          </>
        }
      >
        <form id="renew-member-form" onSubmit={handleRenewSubmit} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-muted/30 border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Plan</span>
              <span className="font-bold text-foreground text-sm">{member.planId?.name || 'Deleted Plan'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/30 border">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Expiry</span>
              <span className="font-bold text-foreground text-sm">{new Date(member.membershipEnd).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Select New Plan *</label>
            {loadingGymPlans ? (
              <div className="py-2 text-muted-foreground">Loading active plans...</div>
            ) : (
              <select
                required
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">-- Choose Plan --</option>
                {gymPlans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} (₹{p.price} | {p.durationMonths} Mo)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Joining Date</label>
              <input
                type="date"
                required
                value={renewJoiningDate}
                onChange={(e) => setRenewJoiningDate(e.target.value)}
                className="w-full h-11 px-3 border rounded-xl bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={renewStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full h-11 px-3 border rounded-xl bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={renewExpiryDate}
                onChange={(e) => setRenewExpiryDate(e.target.value)}
                className="w-full h-11 px-3 border rounded-xl bg-background text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/80 pt-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Plan Price (₹)</label>
              <input
                type="number"
                disabled
                value={renewPlanPrice}
                className="w-full h-11 px-3 border rounded-xl bg-muted text-muted-foreground font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Discount (₹)</label>
              <input
                type="number"
                min={0}
                max={renewPlanPrice}
                placeholder="0"
                value={renewDiscount}
                onChange={(e) => setRenewDiscount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="w-full h-11 px-3 border rounded-xl bg-background text-foreground font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Amount Paid (₹)</label>
              <input
                type="number"
                min={0}
                max={renewPlanPrice - Number(renewDiscount || 0)}
                value={renewAmountPaid}
                onChange={(e) => setRenewAmountPaid(Math.max(0, Number(e.target.value)))}
                className="w-full h-11 px-3 border rounded-xl bg-background text-foreground font-bold text-emerald-500 dark:text-emerald-400"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Remaining Due (₹)</label>
              <input
                type="number"
                disabled
                value={renewRemainingDue}
                className="w-full h-11 px-3 border rounded-xl bg-muted text-rose-500 dark:text-rose-400 font-extrabold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Payment Method</label>
              <select
                value={renewPaymentMethod}
                onChange={(e) => setRenewPaymentMethod(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border bg-background text-foreground"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR Code</option>
                <option value="card">Debit/Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-muted-foreground uppercase mb-1">Remarks / Note</label>
              <input
                type="text"
                placeholder="Remarks..."
                value={renewRemarks}
                onChange={(e) => setRenewRemarks(e.target.value)}
                className="w-full h-11 px-4 border rounded-xl bg-background text-foreground"
              />
            </div>
          </div>

          {/* Renewal Summary Preview Card */}
          <div className="p-3 bg-muted/40 dark:bg-muted/10 border border-border/50 rounded-xl space-y-1">
            <div className="font-bold text-[10px] text-indigo-400 uppercase tracking-wider">Renewal Overview Preview</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground">
              New membership starts on <strong className="text-foreground">{renewStartDate}</strong> and ends on <strong className="text-foreground">{renewExpiryDate}</strong>.
              Total collection: <strong className="text-emerald-500 font-semibold">₹{renewAmountPaid}</strong> with a balance due of <strong className="text-rose-500 font-semibold">₹{renewRemainingDue}</strong>.
            </div>
          </div>
        </form>
      </ResponsiveModal>

      {/* Collect Due Payment Modal */}
      <ResponsiveModal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        title="Log Outstanding Payment"
        subtitle={`Settle dues for member: ${member.name}`}
        maxWidthClass="max-w-md"
        footer={
          collectStep === 1 ? (
            <>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="flex-1 h-11 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setCollectStep(2)}
                disabled={collectAmount === '' || collectAmount <= 0 || collectAmount > (member.remainingAmount + (member.previousOutstanding || 0))}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          ) : collectStep === 2 ? (
            <>
              <button
                type="button"
                onClick={() => setCollectStep(1)}
                className="flex-1 h-11 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCollectStep(3)}
                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md cursor-pointer"
              >
                Next: Preview
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCollectStep(2)}
                className="flex-1 h-11 border hover:bg-muted rounded-xl text-sm font-semibold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleCollectDues()}
                disabled={collecting}
                className="flex-grow h-11 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {collecting ? 'Processing...' : 'Confirm & Save'}
              </button>
            </>
          )
        }
      >
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span className={collectStep === 1 ? "text-primary" : ""}>1. Balance Review</span>
          <span className="h-px bg-muted flex-grow mx-2" />
          <span className={collectStep === 2 ? "text-primary" : ""}>2. Payment Method</span>
          <span className="h-px bg-muted flex-grow mx-2" />
          <span className={collectStep === 3 ? "text-primary" : ""}>3. Confirm Receipt</span>
        </div>

        {collectStep === 1 && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-muted/20 border text-xs space-y-2">
              <div className="flex justify-between">
                <span>Plan Price:</span>
                <span className="font-bold text-foreground">₹{member.planId?.price || (member.amountPaid + member.remainingAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Already Paid (Current Plan):</span>
                <span className="font-bold text-emerald-400">₹{member.amountPaid}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Plan Due:</span>
                <span className="font-bold text-rose-400">₹{member.remainingAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Previous Outstanding Due:</span>
                <span className="font-bold text-rose-400">₹{member.previousOutstanding || 0}</span>
              </div>
              <div className="flex justify-between border-t border-muted/20 pt-2 text-sm">
                <span className="font-semibold">Total Outstanding Due:</span>
                <span className="font-black text-rose-400">₹{member.remainingAmount + (member.previousOutstanding || 0)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount to Collect (₹)</label>
              <input
                type="number"
                required
                min={1}
                max={member.remainingAmount + (member.previousOutstanding || 0)}
                placeholder="Enter amount..."
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
              />
              {collectAmount !== '' && Number(collectAmount) > 0 && (
                <div className="flex justify-between text-[10px] font-bold text-amber-400 mt-2">
                  <span>Remaining After Collection:</span>
                  <span>₹{Math.max(0, (member.remainingAmount + (member.previousOutstanding || 0)) - Number(collectAmount))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {collectStep === 2 && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Payment Method</label>
              <select
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
              >
                <option value="cash">Cash Payment</option>
                <option value="upi">UPI / QR Code Scan</option>
                <option value="card">Credit/Debit Card</option>
                <option value="bank_transfer">Bank Wire Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Notes / Remarks</label>
              <input
                type="text"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                placeholder="e.g. Settle remaining installment"
                className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
              />
            </div>
          </div>
        )}

        {collectStep === 3 && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-muted/20 border text-xs space-y-3">
              <div className="text-center font-bold text-sm border-b pb-2 mb-2">Receipt Preview Details</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member:</span>
                <span className="font-bold text-foreground">{member.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membership Plan:</span>
                <span className="font-bold text-foreground">{member.planId?.name || 'Custom Plan'}</span>
              </div>
              <div className="flex justify-between border-t border-muted/10 pt-2">
                <span className="text-muted-foreground">Amount to Collect:</span>
                <span className="font-bold text-primary">₹{collectAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-bold text-foreground uppercase">{collectMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes:</span>
                <span className="font-medium text-foreground italic">{collectNotes || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-muted/20 pt-2 text-xs font-bold">
                <span className="text-muted-foreground">Remaining Dues After:</span>
                <span className="text-rose-400">₹{Math.max(0, (member.remainingAmount + (member.previousOutstanding || 0)) - Number(collectAmount))}</span>
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* WhatsApp Status Indicator Modal */}
      <ResponsiveModal
        isOpen={whatsAppModal.show}
        onClose={() => setWhatsAppModal({ show: false, url: '', sentClicked: false })}
        title="WhatsApp Delivery Trace"
        maxWidthClass="max-w-sm"
        footer={
          <div className="flex flex-col gap-2 w-full">
            <a
              href={whatsAppModal.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsAppModal(prev => ({ ...prev, sentClicked: true }))}
              className="w-full h-11 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> Send Payment Notification
            </a>
            <button
              onClick={() => setWhatsAppModal({ show: false, url: '', sentClicked: false })}
              className="w-full h-11 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Trace
            </button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full inline-block">
            <MessageCircle className="w-8 h-8" />
          </div>

          <div className="text-left space-y-3 p-4 bg-muted/30 border border-border rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Check className="w-4 h-4" /> <span>Generated: WhatsApp link generated successfully</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              {whatsAppModal.sentClicked ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping ml-1 mr-0.5" />
              )}
              <span>Sent: {whatsAppModal.sentClicked ? 'Message Sent successfully' : 'Waiting for Click-to-Chat execution'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-muted-foreground/60" />
              <span>Opened: Not supported (Requires live Gateway configurations)</span>
            </div>
          </div>
        </div>
      </ResponsiveModal>

      {/* Edit Payment Modal */}
      <ResponsiveModal
        isOpen={showEditPaymentModal && !!editPayment}
        onClose={() => {
          setShowEditPaymentModal(false);
          setEditPayment(null);
        }}
        title="Modify Payment Ledger Item"
        subtitle={editPayment ? `Editing transaction: ${editPayment.receiptNumber}` : ''}
        maxWidthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowEditPaymentModal(false);
                setEditPayment(null);
              }}
              className="flex-1 h-11 border hover:bg-muted rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-payment-form"
              disabled={updatingPayment}
              className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {updatingPayment ? 'Updating...' : 'Save Audit Changes'}
            </button>
          </>
        }
      >
        <form id="edit-payment-form" onSubmit={handleEditPaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">New Amount Collected (₹)</label>
            <input
              type="number"
              required
              min={1}
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Audit Log Notes / Reasons</label>
            <input
              type="text"
              required
              value={editPaymentNotes}
              onChange={(e) => setEditPaymentNotes(e.target.value)}
              placeholder="e.g. Correct typo error from ₹10000 to ₹1000"
              className="w-full h-11 px-4 rounded-xl border bg-background text-sm focus:outline-none"
            />
          </div>
        </form>
      </ResponsiveModal>

      {/* View Receipt Modal */}
      <ResponsiveModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptDetails(null);
        }}
        title="Invoice Payment Receipt"
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex flex-wrap gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                setShowReceiptModal(false);
                setReceiptDetails(null);
              }}
              className="py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs cursor-pointer min-h-[44px]"
            >
              Close
            </button>
            {receiptDetails && (
              <>
                <button
                  onClick={downloadReceiptPDF}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[44px]"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
                <a
                  href={`https://wa.me/${receiptDetails.member?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${receiptDetails.member?.name || 'Member'},\n\n` +
                    `Here is your payment receipt from ${receiptDetails.branding?.gymName || 'GymLedger'}.\n\n` +
                    `Transaction ID: ${receiptDetails.receiptNumber}\n` +
                    `Plan Name: ${receiptDetails.member?.planId?.name || 'Gym Membership'}\n` +
                    `Amount Paid: ₹${receiptDetails.amount}\n` +
                    `Remaining Due: ₹${receiptDetails.pendingAmount}\n` +
                    `Payment Method: ${receiptDetails.paymentMethod.toUpperCase()}\n` +
                    `Date & Time: ${new Date(receiptDetails.paymentDate).toLocaleString('en-IN')}\n` +
                    `Collected By: ${receiptDetails.operatorName || 'Admin'}\n\n` +
                    `Thank you for working out with us!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md min-h-[44px]"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {loadingReceipt ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : !receiptDetails ? (
            <p className="text-center text-muted-foreground">Error loading invoice metadata.</p>
          ) : (
            <div className="space-y-4">
              {/* Branding Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{receiptDetails.branding?.gymName}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{receiptDetails.branding?.address}</p>
                <p className="text-[10px] text-muted-foreground">Contact: {receiptDetails.branding?.contactNumber}</p>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">Transaction Details</div>
                  <div className="mt-1 font-bold">Receipt #: {receiptDetails.receiptNumber}</div>
                  <div>Date: {new Date(receiptDetails.paymentDate).toLocaleString('en-IN')}</div>
                  <div>Method: <span className="uppercase font-semibold">{receiptDetails.paymentMethod}</span></div>
                  <div>Collected By: <span className="font-semibold">{receiptDetails.operatorName || 'Admin'}</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">Payer Details</div>
                  <div className="mt-1 font-bold">Name: {receiptDetails.member?.name}</div>
                  <div>Contact: {receiptDetails.member?.phone}</div>
                  <div>Plan Name: <span className="font-bold text-primary">{receiptDetails.member?.planId?.name || 'Gym Membership'}</span></div>
                </div>
              </div>

              {/* Receipt Audit History details */}
              {(receiptDetails.originalAmount !== undefined || receiptDetails.isVoided) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-800 dark:text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" /> Audited Transaction Log
                  </div>
                  {receiptDetails.isVoided && <div className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400">✓ THIS TRANSACTION IS VOIDED / CANCELLED</div>}
                  {receiptDetails.originalAmount !== undefined && (
                    <div className="text-[10px] space-y-0.5">
                      <div>Original Amount: ₹{receiptDetails.originalAmount}</div>
                      <div>Updated Amount: ₹{receiptDetails.updatedAmount}</div>
                      <div>Updated By: {receiptDetails.updatedBy}</div>
                      <div>Updated Date: {receiptDetails.updatedDate ? new Date(receiptDetails.updatedDate).toLocaleString('en-IN') : 'N/A'}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Receipt Row Table */}
              <div className="border rounded-xl overflow-hidden bg-muted/15">
                <div className="flex justify-between items-center p-3 font-semibold bg-muted/30 border-b">
                  <span>Description</span>
                  <span>Amount Collected</span>
                </div>
                <div className="flex justify-between items-center p-3 font-medium">
                  <span>Gym Studio Membership Fees ({receiptDetails.member?.planId?.name || 'Custom Plan'})</span>
                  <span className="font-bold">₹{receiptDetails.amount}</span>
                </div>
              </div>

              {/* Balances */}
              <div className="space-y-1.5 text-right pt-3 border-t border-border/40 text-xs text-muted-foreground">
                {receiptDetails.originalPrice !== undefined ? (
                  <>
                    <div>Original Plan Price: <span className="font-bold text-foreground">₹{receiptDetails.originalPrice}</span></div>
                    <div>Discount Given: <span className="font-bold text-amber-500">₹{receiptDetails.discount || 0}</span></div>
                    <div>Final Payable Amount: <span className="font-bold text-foreground">₹{receiptDetails.finalPayable}</span></div>
                    <div className="text-sm font-black text-foreground">Amount Paid (Current): ₹{receiptDetails.amount}</div>
                    <div>Previous Outstanding: <span className="font-bold text-rose-500/80 dark:text-rose-400/80">₹{receiptDetails.previousOutstanding || 0}</span></div>
                    <div>Current Membership Due: <span className="font-bold text-rose-500/80 dark:text-rose-400/80">₹{receiptDetails.currentOutstanding || 0}</span></div>
                    <div className="text-sm font-black text-rose-500 dark:text-rose-400">Total Outstanding Due: ₹{receiptDetails.totalOutstanding || 0}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-black text-foreground">Total Paid: ₹{receiptDetails.amount}</div>
                    <div className="text-muted-foreground">Outstanding Dues Balance: ₹{receiptDetails.pendingAmount}</div>
                  </>
                )}
              </div>

              {/* Notes */}
              {receiptDetails.notes && (
                <div className="p-3 rounded-xl bg-muted/20 italic text-muted-foreground">
                  Remarks: {receiptDetails.notes}
                </div>
              )}
            </div>
          )}
        </div>
      </ResponsiveModal>

    </div>
  );
};
