import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV } from '../../utils/exportHelpers';
import {
  Users,
  Award,
  IndianRupee,
  Activity,
  UserPlus,
  QrCode,
  Settings,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Cake,
  Calendar,
  ClipboardList,
  UserCheck,
  PlusCircle,
  FolderPlus,
  X,
  PhoneCall,
  Download,
  MessageCircle
} from 'lucide-react';

interface DashboardStats {
  metrics: {
    totalMembers: number;
    activeMembers: number;
    expiredMembers: number;
    blockedMembers: number;
    monthlyCollections: number;
    newMembersToday: number;
    outstandingDuesCount: number;
  };
  ptPlanOverview: {
    activePtPlans: number;
    expiredPtPlans: number;
    totalPtPlans: number;
  };
  attendanceOverview: {
    todayAttendance: number;
    monthlyAttendance: number;
    uniqueCheckIns: number;
    expiringToday: number;
    ptPlanExpiringToday: number;
    expiring1to3Days: number;
    expiring4to7Days: number;
    expiring8to15Days: number;
    todayBirthdays: number;
  };
  paymentOverview: {
    todayCollection: number;
    membershipCollectedToday: number;
    admissionFees: number;
    membershipCollection: number;
    membershipDue: number;
    ptCollection: number;
    ptDue: number;
    servicePaid: number;
    serviceDue: number;
  };
}

export const GymOwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'membership' | 'payments' | 'attendance'>('membership');
  const [paymentPeriod, setPaymentPeriod] = useState<'this_month' | 'last_month' | 'last_3_months' | 'custom'>('this_month');
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Upgrade Modal & Coupons State
  const [platformPlans, setPlatformPlans] = useState<any[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  const [upgradeCoupon, setUpgradeCoupon] = useState('');
  const [upgradeDiscount, setUpgradeDiscount] = useState<any>(null);
  const [validatingUpgradeCoupon, setValidatingUpgradeCoupon] = useState(false);
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);

  // Reminders & Subscription History Modals
  const [reminders, setReminders] = useState<any[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPlanDetailsModal, setShowPlanDetailsModal] = useState(false);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [topPlans, setTopPlans] = useState<any[]>([]);

  // Expiry / Trial calculations
  const isTrial = user?.isTrial || false;
  const expiryDate = user?.subscription?.expiryDate ? new Date(user.subscription.expiryDate) : null;
  const startDate = user?.subscription?.startDate ? new Date(user.subscription.startDate) : null;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let daysRemaining = 0;
  if (expiryDate) {
    const diffTime = expiryDate.getTime() - todayStart.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let progressPercent = 0;
  if (startDate && expiryDate) {
    const totalDuration = expiryDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const statsData = await api.get('/gymowner/dashboard');
        setStats(statsData);
      } catch (err: any) {
        showToast(err.message || 'Error loading gym stats.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [showToast]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await api.get('/public/plans');
        setPlatformPlans(data);
        if (data.length > 0) {
          setSelectedUpgradePlan(data[0]);
        }
      } catch (err) {
        console.error('Error fetching plans', err);
      }
    }
    fetchPlans();
  }, []);

  useEffect(() => {
    async function fetchActiveCoupons() {
      try {
        const data = await api.get('/public/active-coupons');
        setActiveCoupons(data);
      } catch (err) {
        console.error('Error fetching active coupons', err);
      }
    }
    fetchActiveCoupons();
  }, []);

  useEffect(() => {
    async function fetchReminders() {
      setLoadingReminders(true);
      try {
        const data = await api.get('/notifications/reminders');
        setReminders(data);
      } catch (err) {
        console.error('Error fetching reminders', err);
      } finally {
        setLoadingReminders(false);
      }
    }
    fetchReminders();
  }, []);

  useEffect(() => {
    async function loadExtraDashboardData() {
      try {
        const [membersData, paymentsData] = await Promise.all([
          api.get('/members?includeArchived=true'),
          api.get('/payments')
        ]);
        
        // Recent members
        const sortedMembers = [...membersData]
          .sort((a, b) => new Date(b.createdAt || b.joiningDate).getTime() - new Date(a.createdAt || a.joiningDate).getTime());
        setRecentMembers(sortedMembers);
        
        // Recent payments
        const activePayments = paymentsData.filter((p: any) => !p.isVoided);
        setRecentPayments(activePayments);

        // Top plans aggregation
        const planCounts: { [key: string]: { count: number; price: number; name: string } } = {};
        membersData.forEach((m: any) => {
          if (m.planId) {
            const planKey = m.planId._id;
            if (!planCounts[planKey]) {
              planCounts[planKey] = {
                count: 0,
                price: m.planId.price || 0,
                name: m.planId.name || 'General'
              };
            }
            planCounts[planKey].count++;
          }
        });
        
        const sortedPlans = Object.values(planCounts).sort((a, b) => b.count - a.count);
        setTopPlans(sortedPlans);
      } catch (err) {
        console.error('Error loading dashboard roster data', err);
      }
    }
    loadExtraDashboardData();
  }, []);

  const handleUpgradeCouponValidate = async () => {
    if (!upgradeCoupon.trim()) return;
    setValidatingUpgradeCoupon(true);
    try {
      const res = await api.post('/public/validate-coupon', { code: upgradeCoupon });
      if (res.valid) {
        setUpgradeDiscount(res.coupon);
        showToast(`Coupon applied! ${res.coupon.discountType === 'percentage' ? `${res.coupon.discountValue}% OFF` : `₹${res.coupon.discountValue} OFF`}`, 'success');
      } else {
        setUpgradeDiscount(null);
        showToast(res.message || 'Invalid coupon.', 'error');
      }
    } catch (err: any) {
      setUpgradeDiscount(null);
      showToast(err.message || 'Invalid coupon.', 'error');
    } finally {
      setValidatingUpgradeCoupon(false);
    }
  };

  const handleWhatsAppUpgrade = () => {
    if (!selectedUpgradePlan) return;
    const gymNameVal = user?.branding?.gymName || user?.gymName || 'My Gym';
    const ownerNameVal = user?.ownerName || user?.name || 'Gym Owner';

    const text = encodeURIComponent(
      `Hello GymLedger Team, I want to upgrade my trial workspace to premium.
- Gym Name: ${gymNameVal}
- Owner Name: ${ownerNameVal}
- Selected Plan: ${selectedUpgradePlan.name} (₹${selectedUpgradePlan.price})
- Total Price: ₹${selectedUpgradePlan.price}`
    );

    window.open(`https://wa.me/917742111581?text=${text}`, '_blank');
    setShowUpgradeModal(false);
  };

  const handleWhatsAppRenew = () => {
    const text = encodeURIComponent(
      `Hello GymLedger Team, I want to renew my gym subscription.\n` +
      `- Gym Name: ${user?.branding?.gymName || user?.gymName || 'My Gym'}\n` +
      `- Current Plan: ${user?.subscription?.planType || 'None'}\n` +
      `- Expiry Date: ${user?.subscription?.expiryDate ? new Date(user.subscription.expiryDate).toLocaleDateString('en-IN') : 'N/A'}`
    );
    window.open(`https://wa.me/917742111581?text=${text}`, '_blank');
  };

  const handleExportHistoryCSV = () => {
    const history = user?.subscriptionHistory || [];
    const formatted = history.map((h: any) => ({
      'Transaction ID': h.transactionId || 'N/A',
      'Plan Name': h.planType,
      'Amount Paid': h.amountPaid,
      'Payment Method': (h.paymentMethod || 'cash').toUpperCase(),
      'Start Date': h.startDate ? new Date(h.startDate).toLocaleDateString('en-IN') : 'N/A',
      'Expiry Date': h.expiryDate ? new Date(h.expiryDate).toLocaleDateString('en-IN') : 'N/A',
      'Renewed By': h.renewedBy || 'System',
      'Status': h.status || 'Completed',
      'Transaction Date': h.transactionDate ? new Date(h.transactionDate).toLocaleString('en-IN') : 'N/A'
    }));
    exportToCSV(formatted, 'workspace_subscription_history');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const todayDateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const currentMonthStr = new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  const handleExportMembersCSV = async () => {
    try {
      const data = await api.get('/members?includeArchived=true');
      const formatted = data.map((m: any) => ({
        'Member Name': m.name,
        'Phone': m.phone,
        'Email': m.email || 'N/A',
        'Gender': m.gender,
        'Dues Balance': m.remainingAmount,
        'Total Paid': m.amountPaid,
        'Plan Name': m.planId?.name || 'N/A',
        'Expiry Date': new Date(m.membershipEnd).toLocaleDateString('en-IN'),
        'Archived': m.isArchived ? 'Yes' : 'No'
      }));
      exportToCSV(formatted, 'gym_members_report');
      showToast('Members report exported successfully.', 'success');
    } catch (err) {
      showToast('Error exporting members roster.', 'error');
    }
  };

  const handleExportPaymentsCSV = async () => {
    try {
      const data = await api.get('/payments');
      const formatted = data.map((p: any) => ({
        'Receipt Number': p.receiptNumber,
        'Member Name': p.memberId?.name || 'N/A',
        'Phone': p.memberId?.phone || 'N/A',
        'Amount Collected': p.amount,
        'Remaining Due': p.pendingAmount,
        'Payment Method': p.paymentMethod.toUpperCase(),
        'Payment Date': new Date(p.paymentDate).toLocaleDateString('en-IN'),
        'Operator': p.operatorName || 'Admin',
        'Voided': p.isVoided ? 'Yes' : 'No'
      }));
      exportToCSV(formatted, 'gym_payments_report');
      showToast('Payments report exported successfully.', 'success');
    } catch (err) {
      showToast('Error exporting payments history.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Console</h1>
          <p className="text-xs text-muted-foreground">Monitor member attendance and studio operations.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleExportMembersCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Members CSV
          </button>
          <button
            onClick={handleExportPaymentsCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Payments CSV
          </button>
          <div className="text-xs font-semibold bg-muted px-3 py-1.5 rounded-xl border">
            🏢 {user?.branding?.gymName || user?.gymName || 'GymLedger'}
          </div>
        </div>
      </div>

      {/* Expired Subscription Banner */}
      {daysRemaining < 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Subscription Expired:</span> Your GymLedger workspace license has expired. The platform is running in read-only mode. Please renew now to restore full operations.
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer"
          >
            Renew Subscription
          </button>
        </div>
      )}

      {/* Expiring Soon Banner */}
      {daysRemaining >= 0 && daysRemaining <= 7 && !isTrial && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Subscription Expiring Soon:</span> Your license expires in <span className="font-bold text-amber-400">{daysRemaining} days</span>. Renew now to prevent service interruption.
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer"
          >
            Renew Now
          </button>
        </div>
      )}

      {/* Trial Banner */}
      {isTrial && daysRemaining >= 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-primary/10 to-purple-500/10 border border-primary/20 text-foreground flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">7-Day Free Trial Activated:</span> You have{' '}
              <span className="font-bold text-primary text-sm bg-primary/20 px-2 py-0.5 rounded">
                {daysRemaining > 0 ? daysRemaining : 0} days remaining
              </span>{' '}
              on your trial workspace. Upgrade to keep full management active.
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all whitespace-nowrap active:scale-[0.98]"
          >
            Upgrade Plan Now
          </button>
        </div>
      )}

      {/* Premium My Subscription Card */}
      <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
        {/* Background highlight */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">My Subscription Plan</h3>
              <p className="text-xs text-muted-foreground">Manage your gym platform workspace license.</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border tracking-wider ${
            daysRemaining < 0
              ? 'bg-rose-950/40 text-rose-400 border-rose-500/20'
              : daysRemaining <= 7
              ? 'bg-amber-950/40 text-amber-400 border-amber-500/20'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
          }`}>
            ● {daysRemaining < 0 ? 'Expired' : (daysRemaining <= 7 ? 'Expiring' : 'Active')}
          </span>
        </div>

        {/* Subscription Info Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Current Plan</span>
            <span className="font-bold text-foreground text-sm">{user?.subscription?.planType || 'Free Trial'}</span>
          </div>
          <div>
            <span className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Plan Price</span>
            <span className="font-bold text-foreground text-sm">₹{user?.subscription?.amountPaid || 0}</span>
          </div>
          <div>
            <span className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Start Date</span>
            <span className="font-bold text-foreground text-sm">
              {user?.subscription?.startDate ? new Date(user.subscription.startDate).toLocaleDateString('en-IN') : 'N/A'}
            </span>
          </div>
          <div>
            <span className="block font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Expiry Date</span>
            <span className="font-bold text-foreground text-sm text-rose-400">
              {user?.subscription?.expiryDate ? new Date(user.subscription.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
            </span>
          </div>
        </div>

        {/* Validity & Progress bar */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">License Validity Progress</span>
            <span className="text-foreground">
              {daysRemaining > 0 ? `${daysRemaining} Days Remaining` : '0 Days Remaining (Expired)'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                daysRemaining < 0
                  ? 'bg-rose-500'
                  : daysRemaining <= 7
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${daysRemaining < 0 ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2.5 pt-4 border-t">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Upgrade Plan
          </button>
          <button
            onClick={handleWhatsAppRenew}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border transition-all cursor-pointer"
          >
            Renew Plan
          </button>
          <button
            onClick={() => setShowPlanDetailsModal(true)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border transition-all cursor-pointer"
          >
            View Plan Details
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border transition-all cursor-pointer"
          >
            View Payment History
          </button>
        </div>
      </div>

      {/* Expiry Alert banner */}
      {stats.attendanceOverview.expiringToday > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold">Attention Required:</span> {stats.attendanceOverview.expiringToday} member plans expire today. Collect renewal dues or send reminders!
          </div>
        </div>
      )}

      {/* Core KPI Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Members</span>
          <div className="text-xl font-extrabold text-foreground">{stats.metrics.totalMembers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-emerald-500/10">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Active Members</span>
          <div className="text-xl font-extrabold text-emerald-400">{stats.metrics.activeMembers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-rose-500/10">
          <span className="text-[10px] font-bold text-rose-400 uppercase block">Members With Dues</span>
          <div className="text-xl font-extrabold text-rose-400">{stats.metrics.outstandingDuesCount || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-emerald-500/10">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Today's Collection</span>
          <div className="text-xl font-extrabold text-emerald-400">₹{stats.paymentOverview.todayCollection}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-blue-500/10">
          <span className="text-[10px] font-bold text-secondary uppercase block">Monthly Revenue</span>
          <div className="text-xl font-extrabold text-secondary">₹{stats.metrics.monthlyCollections}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-amber-500/10">
          <span className="text-[10px] font-bold text-amber-400 uppercase block">Expiring This Week</span>
          <div className="text-xl font-extrabold text-amber-400">
            {stats.attendanceOverview.expiringToday + stats.attendanceOverview.expiring1to3Days + stats.attendanceOverview.expiring4to7Days}
          </div>
        </div>
      </div>

      {/* Quick Action shortcuts */}
      <div className="p-5 rounded-2xl bg-card border space-y-3.5 shadow-sm">
        <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <button
            onClick={() => navigate('/app/members')}
            className="flex flex-col items-center justify-center p-3.5 bg-background border hover:border-primary rounded-2xl transition-all gap-2 text-center h-24"
          >
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Register Member</span>
          </button>

          <button
            onClick={() => navigate('/app/attendance')}
            className="flex flex-col items-center justify-center p-3.5 bg-background border hover:border-emerald-500 rounded-2xl transition-all gap-2 text-center h-24"
          >
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Record Attendance</span>
          </button>

          <button
            onClick={() => navigate('/app/payments')}
            className="flex flex-col items-center justify-center p-3.5 bg-background border hover:border-indigo-500 rounded-2xl transition-all gap-2 text-center h-24"
          >
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Collect Payment</span>
          </button>

          <button
            onClick={() => navigate('/app/plans')}
            className="flex flex-col items-center justify-center p-3.5 bg-background border hover:border-amber-500 rounded-2xl transition-all gap-2 text-center h-24"
          >
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Add Plan</span>
          </button>

          <button
            onClick={() => navigate('/app/trainers')}
            className="flex flex-col items-center justify-center p-3.5 bg-background border hover:border-rose-500 rounded-2xl transition-all gap-2 text-center h-24 col-span-2 sm:col-span-1"
          >
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold">Add Trainer</span>
          </button>
        </div>
      </div>

      {/* Split Reminders Panel (Dues & Expiries) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget A: Outstanding Payment Reminders */}
        <div className="p-6 rounded-3xl bg-card border shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b pb-3 shrink-0">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-primary" /> Outstanding Payments
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
              {reminders.filter(r => r.type === 'due').length} Pending
            </span>
          </div>

          {loadingReminders ? (
            <div className="flex justify-center py-12 flex-grow">
              <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : reminders.filter(r => r.type === 'due').length === 0 ? (
            <div className="flex items-center justify-center py-12 flex-grow border border-dashed rounded-2xl bg-muted/5">
              <p className="text-center text-xs text-muted-foreground">No outstanding payments pending.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-grow">
              {reminders.filter(r => r.type === 'due').map((rem, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-background border flex items-center justify-between gap-4 text-xs hover:border-primary/30 transition-all"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-foreground">{rem.member?.name}</div>
                    <div className="text-[10px] text-muted-foreground">Phone: {rem.member?.phone}</div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                      Pending Amount: ₹{rem.member?.remainingAmount}
                    </div>
                  </div>
                  <a
                    href={rem.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 shadow transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Reminder
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget B: Membership Expiry Reminders */}
        <div className="p-6 rounded-3xl bg-card border shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b pb-3 shrink-0">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Membership Expiries (Next 7 Days)
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
              {reminders.filter(r => r.type !== 'due').length} Expiring
            </span>
          </div>

          {loadingReminders ? (
            <div className="flex justify-center py-12 flex-grow">
              <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : reminders.filter(r => r.type !== 'due').length === 0 ? (
            <div className="flex items-center justify-center py-12 flex-grow border border-dashed rounded-2xl bg-muted/5">
              <p className="text-center text-xs text-muted-foreground">No memberships expiring within the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-grow">
              {reminders
                .filter(r => r.type !== 'due')
                .sort((a, b) => (a.daysDiff ?? 0) - (b.daysDiff ?? 0))
                .map((rem, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-background border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-primary/30 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div>
                        <span className="font-bold text-foreground text-sm">{rem.member?.name}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground">({rem.member?.phone})</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Plan: <span className="font-semibold text-foreground">{rem.member?.planId?.name || 'General Plan'}</span> | Expiry: <span className="font-semibold text-foreground">{new Date(rem.member?.membershipEnd).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                        Remaining: {rem.daysDiff} Days
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/app/members/${rem.member?._id}?renew=true`)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold shadow transition-colors cursor-pointer"
                      >
                        Renew Plan
                      </button>
                      <a
                        href={rem.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border bg-card rounded-2xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('membership')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === 'membership'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Membership
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === 'payments'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
            activeTab === 'attendance'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Attendance
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'membership' && (
        <div className="space-y-6">
          {/* Membership Overview */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Membership Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Members</span>
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{stats.metrics.activeMembers}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Expired Members</span>
                  <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-400">{stats.metrics.expiredMembers}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Members</span>
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.metrics.totalMembers}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Blocked Members</span>
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.metrics.blockedMembers}</div>
              </div>
            </div>
          </div>

          {/* PT Plan Overview */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">PT Plan Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Active PT Plans</span>
                <div className="text-xl font-bold text-foreground">{stats.ptPlanOverview.activePtPlans}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expired PT Plans</span>
                <div className="text-xl font-bold text-foreground">{stats.ptPlanOverview.expiredPtPlans}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total PT Plans</span>
                <div className="text-xl font-bold text-foreground">{stats.ptPlanOverview.totalPtPlans}</div>
              </div>
            </div>
          </div>

          {/* Recharts Pie Chart for Membership Distribution */}
          <div className="p-6 rounded-3xl bg-card border shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Membership Breakdown Analytics</h3>
            <div className="h-64 flex flex-col sm:flex-row items-center justify-around gap-4">
              <div className="w-full sm:w-1/2 h-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: stats.metrics.activeMembers || 0 },
                        { name: 'Expired', value: stats.metrics.expiredMembers || 0 },
                        { name: 'Blocked', value: stats.metrics.blockedMembers || 0 }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} Members`, 'Count']} contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs w-full sm:w-1/3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Members
                  </span>
                  <span className="font-bold text-foreground">{stats.metrics.activeMembers}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <span className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Expired Members
                  </span>
                  <span className="font-bold text-foreground">{stats.metrics.expiredMembers}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5">
                  <span className="flex items-center gap-2 font-semibold text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Blocked/Suspended
                  </span>
                  <span className="font-bold text-foreground">{stats.metrics.blockedMembers}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Today's Collection */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Today's Collection — {todayDateStr}</h2>
            <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Membership Collected Today</span>
                <div className="text-2xl font-bold text-emerald-400">₹{stats.paymentOverview.membershipCollectedToday}</div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Collections and Dues */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{currentMonthStr} Performance</h2>
              
              {/* Horizontal Pill Filters */}
              <div className="flex gap-1.5 p-1 bg-muted rounded-xl border text-[10px]">
                <button
                  onClick={() => setPaymentPeriod('this_month')}
                  className={`px-3 py-1 font-bold rounded-lg ${paymentPeriod === 'this_month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setPaymentPeriod('last_month')}
                  className={`px-3 py-1 font-bold rounded-lg ${paymentPeriod === 'last_month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setPaymentPeriod('last_3_months')}
                  className={`px-3 py-1 font-bold rounded-lg ${paymentPeriod === 'last_3_months' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Last 3 M
                </button>
                <button
                  onClick={() => setPaymentPeriod('custom')}
                  className={`px-3 py-1 font-bold rounded-lg ${paymentPeriod === 'custom' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Admission Fees</span>
                <div className="text-xl font-bold text-foreground">₹{stats.paymentOverview.admissionFees}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Membership Collection</span>
                <div className="text-xl font-bold text-emerald-400">₹{stats.paymentOverview.membershipCollection}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-rose-500/10">
                <span className="text-[10px] font-bold text-rose-400 uppercase block">Membership Due</span>
                <div className="text-xl font-bold text-rose-400">₹{stats.paymentOverview.membershipDue}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">PT Due</span>
                <div className="text-xl font-bold text-foreground">₹{stats.paymentOverview.ptDue}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Service Paid</span>
                <div className="text-xl font-bold text-foreground">₹{stats.paymentOverview.servicePaid}</div>
              </div>

              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Service Due</span>
                <div className="text-xl font-bold text-foreground">₹{stats.paymentOverview.serviceDue}</div>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart comparing collection categories and dues */}
          <div className="p-6 rounded-3xl bg-card border shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Collections vs Outstanding Dues Analysis</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Membership', Collected: stats.paymentOverview.membershipCollection, Dues: stats.paymentOverview.membershipDue },
                    { name: 'PT Plans', Collected: stats.paymentOverview.ptCollection || 0, Dues: stats.paymentOverview.ptDue },
                    { name: 'Admission', Collected: stats.paymentOverview.admissionFees || 0, Dues: 0 },
                    { name: 'Other Services', Collected: stats.paymentOverview.servicePaid || 0, Dues: stats.paymentOverview.serviceDue }
                  ]}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dues" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Today's Overview */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Today — {todayDateStr}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Today's Attendance</span>
                <div className="text-xl font-bold text-foreground">{stats.attendanceOverview.todayAttendance}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Today's Birthdays</span>
                <div className="text-xl font-bold text-foreground flex items-center gap-1.5">
                  <Cake className="w-4 h-4 text-primary" /> {stats.attendanceOverview.todayBirthdays}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expires Today</span>
                <div className="text-xl font-bold text-rose-400">{stats.attendanceOverview.expiringToday}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">PT Expiring Today</span>
                <div className="text-xl font-bold text-foreground">{stats.attendanceOverview.ptPlanExpiringToday}</div>
              </div>
            </div>
          </div>

          {/* Monthly Overview */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Attendance — {currentMonthStr}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Monthly Check-ins</span>
                <div className="text-xl font-bold text-primary">{stats.attendanceOverview.monthlyAttendance}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1.5 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Unique Members Checked In</span>
                <div className="text-xl font-bold text-foreground">{stats.attendanceOverview.uniqueCheckIns}</div>
              </div>
            </div>
          </div>

          {/* Membership Expiry Bands */}
          <div className="space-y-3">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Membership Expiry Tracking</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expiring (1–3d)</span>
                <div className="text-xl font-bold text-amber-400">{stats.attendanceOverview.expiring1to3Days}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expiring (4–7d)</span>
                <div className="text-xl font-bold text-foreground">{stats.attendanceOverview.expiring4to7Days}</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expiring (8–15d)</span>
                <div className="text-xl font-bold text-foreground">{stats.attendanceOverview.expiring8to15Days}</div>
              </div>
            </div>
          </div>

          {/* Recharts Area Chart showing check-in and check-out distribution / expiry warning forecast */}
          <div className="p-6 rounded-3xl bg-card border shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Membership Expiry Risk Horizon</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: 'Today', Count: stats.attendanceOverview.expiringToday },
                    { name: '1-3 Days', Count: stats.attendanceOverview.expiring1to3Days },
                    { name: '4-7 Days', Count: stats.attendanceOverview.expiring4to7Days },
                    { name: '8-15 Days', Count: stats.attendanceOverview.expiring8to15Days }
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }} />
                  <Area type="monotone" dataKey="Count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Lists: Recent Registrations, Recent Payments, Top Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations */}
        <div className="p-5 rounded-2xl bg-card border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Recent Registrations
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
              New
            </span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {recentMembers.slice(0, 5).length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No recent registrations.</p>
            ) : (
              recentMembers.slice(0, 5).map((m: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-background border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">Plan: {m.planId?.name || 'No Plan'}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAt || m.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground">{m.phone}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="p-5 rounded-2xl bg-card border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" /> Recent Payments
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Collected
            </span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {recentPayments.slice(0, 5).length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No recent payments.</p>
            ) : (
              [...recentPayments].sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 5).map((p: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-background border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground">{p.memberId?.name || 'Unknown Member'}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Method: {p.paymentMethod}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="font-bold text-emerald-400">+₹{p.amount}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Plans */}
        <div className="p-5 rounded-2xl bg-card border space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Top Active Plans
            </h3>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Popular
            </span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {topPlans.slice(0, 5).length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No active plans data.</p>
            ) : (
              topPlans.slice(0, 5).map((tp: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-background border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground">{tp.name}</div>
                    <div className="text-[10px] text-muted-foreground">Price: ₹{tp.price}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="font-extrabold text-primary text-sm">{tp.count}</div>
                    <div className="text-[10px] text-muted-foreground">members</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) for Record Attendance */}
      <button
        onClick={() => navigate('/app/attendance')}
        className="fixed bottom-20 right-6 sm:bottom-6 sm:right-6 z-40 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-xs touch-manipulation"
        style={{ minHeight: '44px' }}
      >
        <UserCheck className="w-4 h-4 flex-shrink-0" />
        <span>Record Attendance</span>
      </button>

      {/* Upgrade Subscription Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-muted/50 p-6 rounded-3xl max-w-md w-full relative">
            <button
              onClick={() => {
                setShowUpgradeModal(false);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
 
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-foreground">Upgrade to Premium Plan</h3>
                <p className="text-xs text-muted-foreground">
                  Upgrade your gym workspace and unlock full management tools.
                </p>
              </div>
 
              <div className="space-y-4">
                {/* Gym Details */}
                <div className="bg-secondary/20 border border-border/30 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gym Name</span>
                    <span className="font-semibold text-foreground">{user?.branding?.gymName || user?.gymName || 'My Gym'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner Name</span>
                    <span className="font-semibold text-foreground">{user?.ownerName || user?.name || 'Gym Owner'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Subscription Plan</label>
                  <select
                    value={selectedUpgradePlan?.name || ''}
                    onChange={(e) => {
                      const selected = platformPlans.find(p => p.name === e.target.value);
                      if (selected) setSelectedUpgradePlan(selected);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {platformPlans.length > 0 ? (
                      platformPlans.map((p) => (
                        <option key={p._id} value={p.name}>{p.name} (₹{p.price})</option>
                      ))
                    ) : (
                      <>
                        <option value="Monthly">Monthly (₹179)</option>
                        <option value="Quarterly">Quarterly (₹449)</option>
                        <option value="Half-Yearly">Half-Yearly (₹699)</option>
                        <option value="Yearly">Yearly (₹1299)</option>
                      </>
                    )}
                  </select>
                </div>
 
                {selectedUpgradePlan && (
                  <div className="border-t border-muted/30 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Plan Price</span>
                      <span>₹{selectedUpgradePlan.price}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground border-t border-muted/20 pt-2">
                      <span>Total Amount</span>
                      <span>₹{selectedUpgradePlan.price}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleWhatsAppUpgrade}
                  className="w-full mt-2 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 text-xs text-center transition-all flex items-center justify-center gap-2"
                >
                  Confirm & Buy via WhatsApp <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Subscription History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-muted/50 p-6 rounded-3xl max-w-4xl w-full relative max-h-[90vh] flex flex-col shadow-2xl">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-1 rounded-lg cursor-pointer animate-pulse"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b pb-3 mb-4 pr-10">
              <div>
                <h3 className="text-lg font-bold text-foreground">Workspace Subscription History</h3>
                <p className="text-xs text-muted-foreground">Ledger of platform renewals and workspace license logs.</p>
              </div>
              <button
                onClick={handleExportHistoryCSV}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-background border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
            </div>

            <div className="flex-grow overflow-y-auto">
              {(!user?.subscriptionHistory || user.subscriptionHistory.length === 0) ? (
                <p className="text-center text-xs text-muted-foreground py-12">No subscription renewal logs recorded yet.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground uppercase font-bold">
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Plan Type</th>
                      <th className="p-3">Price Paid</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Renewed By</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Transaction Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {user.subscriptionHistory.map((h: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/15">
                        <td className="p-3 font-mono font-bold text-primary">{h.transactionId || 'N/A'}</td>
                        <td className="p-3 font-semibold">{h.planType}</td>
                        <td className="p-3 font-bold">₹{h.amountPaid}</td>
                        <td className="p-3 uppercase font-semibold text-muted-foreground">{h.paymentMethod || 'cash'}</td>
                        <td className="p-3">{h.startDate ? new Date(h.startDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td className="p-3 text-rose-400 font-semibold">{h.expiryDate ? new Date(h.expiryDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td className="p-3 text-muted-foreground">{h.renewedBy || 'System'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                            {h.status || 'Completed'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{h.transactionDate ? new Date(h.transactionDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Details Modal */}
      {showPlanDetailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-muted/50 p-6 rounded-3xl max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setShowPlanDetailsModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all hover:bg-muted p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 border-b pb-4 mb-4">
              <h3 className="text-lg font-bold text-foreground">Current Plan Details</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                {user?.subscription?.planType || 'Free Trial'}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 border rounded-2xl">
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Price Paid</span>
                  <span className="font-bold text-foreground text-sm">₹{user?.subscription?.amountPaid || 0}</span>
                </div>
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Days Remaining</span>
                  <span className="font-bold text-rose-400 text-sm">{daysRemaining > 0 ? daysRemaining : 0} Days</span>
                </div>
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Starts</span>
                  <span className="font-bold text-foreground">
                    {user?.subscription?.startDate ? new Date(user.subscription.startDate).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground uppercase tracking-wider text-[9px]">Expires</span>
                  <span className="font-bold text-foreground">
                    {user?.subscription?.expiryDate ? new Date(user.subscription.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[9px]">Platform Plan Inclusions</h4>
                <ul className="space-y-1.5 pl-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Complete Roster Members Registry</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>QR Code Attendance Simulator Scanner</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Auto Expiry &amp; Outstanding Dues Reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>WhatsApp Click-to-Chat Welcome &amp; Due Receipts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Financial Ledger, Auditing and PDF Invoice Exports</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setShowPlanDetailsModal(false);
                  setShowUpgradeModal(true);
                }}
                className="w-full mt-2 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl text-center shadow transition-all cursor-pointer"
              >
                Upgrade or Extend Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
