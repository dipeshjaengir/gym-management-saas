import React, { useEffect, useState } from 'react';
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
  Download
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

  // Trial calculations
  const isTrial = user?.isTrial || false;
  let remainingTrialDays = 0;
  if (isTrial && user?.subscription?.expiryDate) {
    const expiry = new Date(user.subscription.expiryDate);
    const diffTime = expiry.getTime() - new Date().getTime();
    remainingTrialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    if (isTrial) {
      fetchPlans();
    }
  }, [isTrial]);

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

    const finalPrice = upgradeDiscount
      ? (upgradeDiscount.discountType === 'percentage'
          ? Math.round(selectedUpgradePlan.price * (1 - upgradeDiscount.discountValue / 100))
          : Math.max(0, selectedUpgradePlan.price - upgradeDiscount.discountValue))
      : selectedUpgradePlan.price;

    const couponPart = upgradeDiscount ? `Applied Coupon: ${upgradeCoupon.toUpperCase()} (${upgradeDiscount.discountType === 'percentage' ? `${upgradeDiscount.discountValue}% OFF` : `₹${upgradeDiscount.discountValue} OFF`})` : 'Applied Coupon: None';

    const text = encodeURIComponent(
      `Hello GymLedger Team, I want to upgrade my trial workspace to premium.
- Gym Name: ${gymNameVal}
- Owner Name: ${ownerNameVal}
- Selected Plan: ${selectedUpgradePlan.name} (₹${selectedUpgradePlan.price})
- ${couponPart}
- Total Price: ₹${finalPrice}`
    );

    window.open(`https://wa.me/917742111581?text=${text}`, '_blank');
    setShowUpgradeModal(false);
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

      {/* Trial Banner */}
      {isTrial && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-primary/10 to-purple-500/10 border border-primary/20 text-foreground flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-foreground">7-Day Free Trial Activated:</span> You have{' '}
              <span className="font-bold text-primary text-sm bg-primary/20 px-2 py-0.5 rounded">
                {remainingTrialDays > 0 ? remainingTrialDays : 0} days remaining
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
        </div>
      )}

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
                   setUpgradeCoupon('');
                setUpgradeDiscount(null);
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
 
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upgradeCoupon}
                      onChange={(e) => setUpgradeCoupon(e.target.value.toUpperCase())}
                      placeholder="e.g. SUMMER25"
                      className="flex-grow px-4 py-2.5 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none uppercase font-bold text-center tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={handleUpgradeCouponValidate}
                      disabled={validatingUpgradeCoupon}
                      className="px-4 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90"
                    >
                      {validatingUpgradeCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                  {upgradeDiscount && (
                    <p className="text-xs text-emerald-400 font-bold mt-1.5">
                      ✓ Coupon Applied! Discount: {upgradeDiscount.discountType === 'percentage' ? `${upgradeDiscount.discountValue}% OFF` : `₹${upgradeDiscount.discountValue} OFF`}
                    </p>
                  )}
                </div>
 
                {selectedUpgradePlan && (
                  <div className="border-t border-muted/30 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Plan Price</span>
                      <span>₹{selectedUpgradePlan.price}</span>
                    </div>
                    {upgradeDiscount && (
                      <div className="flex justify-between text-xs text-emerald-400">
                        <span>Discount</span>
                        <span>
                          -₹
                          {upgradeDiscount.discountType === 'percentage'
                            ? Math.round(selectedUpgradePlan.price * (upgradeDiscount.discountValue / 100))
                            : upgradeDiscount.discountValue}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-foreground border-t border-muted/20 pt-2">
                      <span>Total Amount</span>
                      <span>
                        ₹
                        {upgradeDiscount
                          ? Math.max(
                              0,
                              selectedUpgradePlan.price -
                                (upgradeDiscount.discountType === 'percentage'
                                  ? Math.round(selectedUpgradePlan.price * (upgradeDiscount.discountValue / 100))
                                  : upgradeDiscount.discountValue)
                            )
                          : selectedUpgradePlan.price}
                      </span>
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
    </div>
  );
};
