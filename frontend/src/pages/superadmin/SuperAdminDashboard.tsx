import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  TrendingUp,
  Users,
  Building2,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
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
}

export const SuperAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.get('/superadmin/dashboard');
        setMetrics(data.metrics);
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

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-xs text-muted-foreground">Real-time subscription revenues and tenant telemetry.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 border rounded-xl bg-card hover:bg-muted text-xs font-semibold"
          >
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold shadow"
          >
            Export PDF Report
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Gym Owners</span>
            <div className="text-2xl font-bold text-foreground">
              {metrics.activeGymOwners} <span className="text-xs text-muted-foreground font-normal">/ {metrics.totalGymOwners}</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-primary">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Gym Members</span>
            <div className="text-2xl font-bold text-foreground">{metrics.totalMembers}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Revenue</span>
            <div className="text-2xl font-bold text-emerald-400">₹{metrics.monthlyRevenue}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yearly Revenue</span>
            <div className="text-2xl font-bold text-foreground">₹{metrics.yearlyRevenue}</div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
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
    </div>
  );
};
