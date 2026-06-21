import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
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
  TrendingDown
} from 'lucide-react';

interface DashboardStats {
  metrics: {
    totalMembers: number;
    activeMembers: number;
    expiredMembers: number;
    membershipExpiringSoon: number;
    monthlyCollections: number;
    newMembersToday: number;
  };
  feeRecovery: {
    totalPendingAmount: number;
    outstandingDuesCount: number;
    expiringToday: number;
    expiringWithin3Days: number;
    alreadyExpired: number;
  };
}

interface CheckIn {
  _id: string;
  memberId: {
    name: string;
    phone: string;
    qrCode: string;
    gender: string;
  };
  date: string;
  checkInTime: string;
  status: string;
}

export const GymOwnerDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [statsData, checkInsData] = await Promise.all([
          api.get('/gymowner/dashboard'),
          api.get('/attendance/daily')
        ]);
        setStats(statsData);
        setRecentCheckIns(checkInsData.slice(0, 5)); // Show top 5 check-ins
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gym Console</h1>
        <p className="text-xs text-muted-foreground">Monitor member attendance and studio operations.</p>
      </div>

      {/* Expiry / Dues Alert banner */}
      {stats.metrics.membershipExpiringSoon > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold">Attention Required:</span> {stats.metrics.membershipExpiringSoon} member plans are expiring soon (this week). Send reminders to prevent churn.
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Members</span>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {stats.metrics.totalMembers}
            </div>
          </div>
          <div className="hidden sm:block p-3 bg-primary/10 rounded-xl text-primary">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Members</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">
              {stats.metrics.activeMembers}
            </div>
          </div>
          <div className="hidden sm:block p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collections (Mo)</span>
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              ₹{stats.metrics.monthlyCollections}
            </div>
          </div>
          <div className="hidden sm:block p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Dues</span>
            <div className="text-xl sm:text-2xl font-bold text-rose-400">
              ₹{stats.feeRecovery.totalPendingAmount}
            </div>
          </div>
          <div className="hidden sm:block p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shortcuts */}
        <div className="p-6 rounded-2xl bg-card border space-y-4 shadow-sm md:col-span-2">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quick Console Shortcuts</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/app/members')}
              className="p-4 rounded-xl bg-background border hover:border-primary transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="p-2 bg-primary/10 rounded-lg text-primary w-fit group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs sm:text-sm">Add New Member</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/app/attendance')}
              className="p-4 rounded-xl bg-background border hover:border-primary transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 w-fit group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs sm:text-sm">QR Code Check-in</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/app/recovery')}
              className="p-4 rounded-xl bg-background border hover:border-primary transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 w-fit group-hover:scale-105 transition-transform">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs sm:text-sm">Fee Recovery</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => navigate('/app/branding')}
              className="p-4 rounded-xl bg-background border hover:border-primary transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 w-fit group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs sm:text-sm">Branding Settings</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Check-ins Feed */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Daily check-ins
            </h2>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Today</span>
          </div>

          {recentCheckIns.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No check-ins logged yet today. Use the check-in scanner to scan member passes.
            </div>
          ) : (
            <div className="space-y-3">
              {recentCheckIns.map((ci) => (
                <div key={ci._id} className="flex items-center justify-between p-3 rounded-xl bg-background border text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold">{ci.memberId?.name || 'Gym Member'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{ci.memberId?.qrCode}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {ci.checkInTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
