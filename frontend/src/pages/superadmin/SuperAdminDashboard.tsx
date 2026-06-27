import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { exportToCSV } from '../../utils/exportHelpers';
import {
  TrendingUp,
  Users,
  Building2,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Layers,
  ArrowUpRight,
  Download,
  Ticket
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { generateRevenueReportPDF, exportToExcel } from '../../utils/exportHelpers';

interface Metrics {
  totalGymOwners: number;
  activeGymOwners: number;
  expiredGymOwners: number;
  suspendedGymOwners: number;
  totalMembers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  expectedRenewalRevenue: number;
  expiringThisMonth: number;
  renewalsDue: number;
  trialUsers?: number;
  activeSubscribers?: number;
  suspendedAccounts?: number;
  totalCoupons?: number;
  activeCoupons?: number;
  totalCouponUses?: number;
  trialConversionRate?: number;
  convertedOwners?: number;
  planDistribution?: { [key: string]: number };
}

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.get('/superadmin/dashboard');
        setMetrics(data.metrics);
        setRecentActivities(data.recentActivities || []);
      } catch (err: any) {
        showToast(err.message || 'Error loading dashboard metrics.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!metrics) return null;

  const handleExportPDF = () => {
    if (metrics) {
      generateRevenueReportPDF(metrics);
    }
  };

  const handleExportExcel = () => {
    if (!metrics) return;
    const formatted = [{
      'Total Gym Owners': metrics.totalGymOwners,
      'Active Gym Owners': metrics.activeGymOwners,
      'Expired Gym Owners': metrics.expiredGymOwners,
      'Suspended Gym Owners': metrics.suspendedGymOwners,
      'Total Members': metrics.totalMembers,
      'Monthly Revenue (INR)': metrics.monthlyRevenue,
      'Yearly Revenue (INR)': metrics.yearlyRevenue,
      'Expected Renewal Revenue (INR)': metrics.expectedRenewalRevenue,
      'Expiring This Month': metrics.expiringThisMonth,
      'Renewals Due': metrics.renewalsDue
    }];
    exportToExcel(formatted, 'saas_platform_revenue_report', 'Revenue');
  };

  const chartData = [
    { name: 'Active Owners', value: metrics.activeGymOwners, color: '#10b981' },
    { name: 'Expired Owners', value: metrics.expiredGymOwners, color: '#f59e0b' },
    { name: 'Suspended Owners', value: metrics.suspendedGymOwners, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const handleExportGymOwnersCSV = async () => {
    try {
      const data = await api.get('/superadmin/owners');
      const formatted = data.map((o: any) => ({
        'Gym Name': o.gymName,
        'Owner Name': o.ownerName,
        'Email': o.email,
        'Phone': o.phone,
        'Status': o.status,
        'Plan': o.subscription.planType,
        'Expiry': new Date(o.subscription.expiryDate).toLocaleDateString('en-IN')
      }));
      exportToCSV(formatted, 'saas_gym_owners');
      showToast('Gym Owners list exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export Gym Owners.', 'error');
    }
  };

  const handleExportRevenueCSV = () => {
    if (!metrics) return;
    const data = [{
      'Monthly Recurring Revenue': metrics.monthlyRevenue,
      'Yearly Revenue': metrics.yearlyRevenue,
      'Expected Renewal Collections': metrics.expectedRenewalRevenue,
      'Active Subscriptions': metrics.activeSubscribers,
      'Trial Accounts': metrics.trialUsers,
      'Suspended Accounts': metrics.suspendedAccounts
    }];
    exportToCSV(data, 'saas_platform_revenue');
    showToast('Revenue metrics exported successfully.', 'success');
  };

  const handleExportSubscriptionHistoryCSV = async () => {
    try {
      const data = await api.get('/superadmin/owners');
      const history: any[] = [];
      data.forEach((o: any) => {
        if (o.subscriptionHistory) {
          o.subscriptionHistory.forEach((h: any) => {
            history.push({
              'Gym Name': o.gymName,
              'Owner Name': o.ownerName,
              'Owner Email': o.email,
              'Plan Purchased': h.planType,
              'Amount Paid': h.amountPaid,
              'Start Date': new Date(h.startDate).toLocaleDateString('en-IN'),
              'Expiry Date': new Date(h.expiryDate).toLocaleDateString('en-IN'),
              'Renewed By': h.renewedBy || 'Admin',
              'Transaction Date': new Date(h.transactionDate).toLocaleDateString('en-IN')
            });
          });
        }
      });
      if (history.length === 0) {
        showToast('No subscription history logs found.', 'info');
        return;
      }
      exportToCSV(history, 'saas_subscription_history');
      showToast('Subscription history exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export subscription history.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-xs text-muted-foreground">Real-time subscription revenues and tenant telemetry.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportGymOwnersCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Gym Owners CSV
          </button>
          <button
            onClick={handleExportRevenueCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Revenue CSV
          </button>
          <button
            onClick={handleExportSubscriptionHistoryCSV}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-xs shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Sub History CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold shadow shadow-md cursor-pointer"
          >
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Gym Owners</span>
          <div className="text-xl font-extrabold text-foreground">{metrics.totalGymOwners}</div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-indigo-500/10">
          <span className="text-[10px] font-bold text-primary uppercase block">Trial Users</span>
          <div className="text-xl font-extrabold text-foreground">{metrics.trialUsers || 0}</div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-emerald-500/10">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Active Subscribers</span>
          <div className="text-xl font-extrabold text-emerald-400">{metrics.activeSubscribers || 0}</div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-rose-500/10">
          <span className="text-[10px] font-bold text-rose-400 uppercase block">Suspended Accounts</span>
          <div className="text-xl font-extrabold text-rose-400">{metrics.suspendedAccounts || 0}</div>
        </div>

        {/* KPI 5 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-emerald-500/10">
          <span className="text-[10px] font-bold text-emerald-400 uppercase block">Monthly Recurring Rev</span>
          <div className="text-xl font-extrabold text-emerald-400">₹{metrics.monthlyRevenue}</div>
        </div>

        {/* KPI 6 */}
        <div className="p-4 rounded-2xl bg-card border space-y-1 shadow-sm border-amber-500/10">
          <span className="text-[10px] font-bold text-amber-400 uppercase block">Renewals Due</span>
          <div className="text-xl font-extrabold text-amber-400">{metrics.renewalsDue}</div>
        </div>
      </div>

      {/* Expiry Sub-Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Expiration telemetry
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-background border space-y-1">
              <span className="text-xs text-muted-foreground">Expiring This Month</span>
              <div className="text-xl font-bold text-amber-500">{metrics.expiringThisMonth}</div>
            </div>
            <div className="p-4 rounded-xl bg-background border space-y-1">
              <span className="text-xs text-muted-foreground">Renewals Due</span>
              <div className="text-xl font-bold text-amber-500">{metrics.renewalsDue}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background border flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Expected Renewal Revenue</span>
              <div className="text-lg font-bold text-emerald-400">₹{metrics.expectedRenewalRevenue}</div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Pie Chart Status Allocation */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm lg:col-span-2 flex flex-col justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-primary" /> Tenant Status Ratio
          </h2>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 min-h-[180px]">
            {chartData.length > 0 ? (
              <>
                <div className="w-[180px] h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-medium text-muted-foreground">{d.name}:</span>
                      <span className="font-bold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-6">
                No subscription distributions to map. Create owners to inspect ratios.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SaaS Telemetry: Plan Distribution & Coupons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Analytics */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm lg:col-span-2 flex flex-col justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-primary" /> Subscription Plan Distribution
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  metrics.planDistribution
                    ? Object.keys(metrics.planDistribution).map((key) => ({
                        name: key,
                        Gyms: metrics.planDistribution![key]
                      }))
                    : []
                }
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #262626', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="Gyms" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coupon & Trial Telemetry */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm flex flex-col gap-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> Coupon &amp; Conversion Analytics
          </h2>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {/* Conversion */}
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Trial Conversion Rate</span>
                <span className="text-lg font-black text-foreground">{metrics.trialConversionRate || 0}%</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-950/40 text-indigo-400 border border-indigo-500/25">
                {metrics.convertedOwners || 0} Converted
              </span>
            </div>

            {/* Coupons Total */}
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Active Coupons</span>
                <span className="text-lg font-black text-foreground">{metrics.activeCoupons || 0} / {metrics.totalCoupons || 0}</span>
              </div>
            </div>

            {/* Coupons Usage */}
            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Coupon Usage Redemptions</span>
                <span className="text-lg font-black text-emerald-400">{metrics.totalCouponUses || 0} Times</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
