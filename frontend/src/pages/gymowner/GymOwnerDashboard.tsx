import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  FolderPlus
} from 'lucide-react';

interface DashboardStats {
  metrics: {
    totalMembers: number;
    activeMembers: number;
    expiredMembers: number;
    blockedMembers: number;
    monthlyCollections: number;
    newMembersToday: number;
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

  return (
    <div className="space-y-6 pb-20 md:pb-6 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Console</h1>
          <p className="text-xs text-muted-foreground">Monitor member attendance and studio operations.</p>
        </div>
        <div className="hidden sm:block text-xs font-semibold bg-muted px-3 py-1.5 rounded-xl border">
          🏢 {user?.branding?.gymName || user?.gymName || 'Iron Forge'}
        </div>
      </div>

      {/* Trial Banner */}
      {isTrial && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-primary/10 to-purple-500/10 border border-primary/20 text-primary-foreground flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-white">7-Day Free Trial Activated:</span> You have{' '}
              <span className="font-bold text-primary text-sm bg-primary/20 px-2 py-0.5 rounded">
                {remainingTrialDays > 0 ? remainingTrialDays : 0} days remaining
              </span>{' '}
              on your trial workspace. Upgrade to keep full management active.
            </div>
          </div>
          <button
            onClick={() => {
              const text = encodeURIComponent(`Hello, I want to upgrade my Gym Management Trial Workspace "${user?.gymName || ''}" (${user?.email || ''}) to a Premium Subscription.`);
              window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
            }}
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
    </div>
  );
};
