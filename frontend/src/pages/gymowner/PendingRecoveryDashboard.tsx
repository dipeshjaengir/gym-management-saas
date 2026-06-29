import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportToCSV } from '../../utils/exportHelpers';
import {
  IndianRupee,
  AlertTriangle,
  MessageCircle,
  Clock,
  Search,
  CheckCircle,
  Mail,
  UserCheck,
  TrendingDown,
  Download
} from 'lucide-react';

interface Member {
  _id: string;
  name: string;
  phone: string;
  email: string;
  remainingAmount: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  membershipStart: string;
  membershipEnd: string;
  lastPaymentDate?: string;
  previousOutstanding?: number;
  discount?: number;
  planId?: {
    name: string;
    price: number;
  };
}

export const PendingRecoveryDashboard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalPendingAmount: 0,
    outstandingDuesCount: 0,
    expiringToday: 0,
    expiringWithin3Days: 0,
    alreadyExpired: 0
  });

  const { showToast } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDaysOverdue = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (expiry >= todayStart) return 0;
    const diffTime = todayStart.getTime() - expiry.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    loadDuesData();
  }, []);

  const loadDuesData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all members and filter client-side to find outstanding dues
      const allMembers = await api.get('/members');
      const duesOnly = allMembers.filter((m: Member) => (m.remainingAmount + (m.previousOutstanding || 0)) > 0);
      setMembers(duesOnly);

      // 2. Calculate metrics client-side from duesOnly to prevent backend mismatches
      const totalPendingAmount = duesOnly.reduce((sum: number, m: Member) => sum + m.remainingAmount + (m.previousOutstanding || 0), 0);
      const outstandingDuesCount = duesOnly.length;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const threeDaysFromNow = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000);

      let expiringToday = 0;
      let expiringWithin3Days = 0;
      let alreadyExpired = 0;

      duesOnly.forEach((m: Member) => {
        if (!m.membershipEnd) return;
        const expiry = new Date(m.membershipEnd);
        if (expiry < todayStart) {
          alreadyExpired++;
        } else if (expiry >= todayStart && expiry <= todayEnd) {
          expiringToday++;
        } else if (expiry > todayEnd && expiry <= threeDaysFromNow) {
          expiringWithin3Days++;
        }
      });

      setDashboardMetrics({
        totalPendingAmount,
        outstandingDuesCount,
        expiringToday,
        expiringWithin3Days,
        alreadyExpired
      });
    } catch (err: any) {
      showToast(err.message || 'Error loading dues telemetry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = (member: Member) => {
    const formattedPhone = member.phone.replace(/[^0-9]/g, '');
    const gymName = user?.branding?.gymName || user?.gymName || 'GymLedger';
    const planName = member.planId?.name || 'Gym Membership';
    const totalDues = member.remainingAmount + (member.previousOutstanding || 0);
    
    // Construct prefilled message for recovery
    const text = encodeURIComponent(
      `Hello ${member.name}, this is a friendly reminder from ${gymName} Gym.\n\n` +
      `Your account has outstanding balance dues of ₹${totalDues} for the ${planName} plan.\n` +
      `Please settle the pending amount at the gym desk or online to keep your access active. Thank you!`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    const end = new Date(m.membershipEnd);

    if (activeTab === 'today') {
      return end >= todayStart && end <= todayEnd;
    }
    if (activeTab === 'week') {
      const sevenDaysFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      return end >= todayStart && end <= sevenDaysFromNow;
    }
    if (activeTab === 'overdue') {
      return end < todayStart;
    }

    return true;
  });

  const handleExportCSV = () => {
    const data = filteredMembers.map(m => ({
      'Member Name': m.name,
      'Phone': m.phone,
      'Email': m.email || 'N/A',
      'Original Price': m.planId?.price || 0,
      'Discount': m.discount || 0,
      'Final Payable': (m.planId?.price || 0) - (m.discount || 0),
      'Amount Paid': m.amountPaid,
      'Current Membership Due': m.remainingAmount,
      'Previous Outstanding': m.previousOutstanding || 0,
      'Total Outstanding': m.remainingAmount + (m.previousOutstanding || 0),
      'Plan Name': m.planId?.name || 'N/A',
      'Membership Expiry': m.membershipEnd ? new Date(m.membershipEnd).toLocaleDateString('en-IN') : 'N/A',
      'Last Payment Date': m.lastPaymentDate ? new Date(m.lastPaymentDate).toLocaleDateString('en-IN') : 'N/A',
      'Days Overdue': m.membershipEnd ? getDaysOverdue(m.membershipEnd) : 0
    }));
    exportToCSV(data, 'pending_dues_recovery');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pending Fee Recovery</h1>
          <p className="text-xs text-muted-foreground">Manage unpaid balances and send payment reminders to members.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pending Dues</span>
            <div className="text-2xl font-bold text-rose-400">₹{dashboardMetrics.totalPendingAmount}</div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Members</span>
            <div className="text-2xl font-bold text-foreground">{dashboardMetrics.outstandingDuesCount}</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue &amp; Expired</span>
            <div className="text-2xl font-bold text-rose-400">{dashboardMetrics.alreadyExpired}</div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-card border flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming (3 Days)</span>
            <div className="text-2xl font-bold text-foreground">
              {dashboardMetrics.expiringWithin3Days + dashboardMetrics.expiringToday}
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-primary">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-4 rounded-xl bg-card border">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or contact..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'today', 'week', 'overdue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-primary border-primary text-primary-foreground shadow'
                  : 'bg-background hover:bg-muted border-border text-muted-foreground'
              }`}
            >
              {tab === 'all' && 'All Dues'}
              {tab === 'today' && 'Due Today'}
              {tab === 'week' && 'Due This Week'}
              {tab === 'overdue' && 'Overdue'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dues List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">100% Settled!</p>
          <p className="text-xs text-muted-foreground mt-1">Excellent! None of your gym members have pending balances right now.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredMembers.map((member) => (
              <div key={member._id} className="p-4 rounded-xl bg-card border space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/app/members/${member._id}`)}
                    className="font-bold text-sm text-primary hover:underline text-left cursor-pointer"
                  >
                    {member.name}
                  </button>
                  <span className="text-xs font-black text-rose-500">Total Due: ₹{member.remainingAmount + (member.previousOutstanding || 0)}</span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Phone: <span className="text-foreground">{member.phone}</span></div>
                  <div>Plan: <span className="text-foreground">{member.planId?.name || 'General Membership'}</span></div>
                  <div>Original Price: <span className="text-foreground">₹{member.planId?.price || 0}</span></div>
                  <div>Discount: <span className="text-amber-500">₹{member.discount || 0}</span></div>
                  <div>Final Payable: <span className="text-foreground">₹{(member.planId?.price || 0) - (member.discount || 0)}</span></div>
                  <div>Paid (Current): <span className="text-foreground">₹{member.amountPaid}</span></div>
                  <div>Current Plan Due: <span className="text-rose-400">₹{member.remainingAmount}</span></div>
                  <div>Previous Due: <span className="text-rose-400">₹{member.previousOutstanding || 0}</span></div>
                  <div>Last Paid: <span className="text-foreground">{member.lastPaymentDate ? new Date(member.lastPaymentDate).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                  <div>Ends: <span className="text-foreground">{member.membershipEnd ? new Date(member.membershipEnd).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                  <div>Days Overdue: <span className="text-rose-400 font-bold">{member.membershipEnd ? `${getDaysOverdue(member.membershipEnd)} Days` : 'N/A'}</span></div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleSendReminder(member)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Phone Number</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Plan Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Original / Disc / Payable</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Amount Paid</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Plan Due / Prev Due</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Total Outstanding</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Days Overdue</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-bold">
                      <button
                        onClick={() => navigate(`/app/members/${member._id}`)}
                        className="text-primary hover:underline font-bold text-left cursor-pointer focus:outline-none"
                      >
                        {member.name}
                      </button>
                    </td>
                    <td className="p-4">{member.phone}</td>
                    <td className="p-4 font-semibold">{member.planId?.name || 'Custom Plan'}</td>
                    <td className="p-4">
                      <span className="font-semibold">₹{member.planId?.price || 0}</span> / <span className="text-amber-500 font-semibold">₹{member.discount || 0}</span> = <span className="font-bold">₹{(member.planId?.price || 0) - (member.discount || 0)}</span>
                    </td>
                    <td className="p-4">₹{member.amountPaid}</td>
                    <td className="p-4 font-semibold text-rose-500/80 dark:text-rose-400/80">
                      ₹{member.remainingAmount} / ₹{member.previousOutstanding || 0}
                    </td>
                    <td className="p-4 font-bold text-rose-500">
                      ₹{member.remainingAmount + (member.previousOutstanding || 0)}
                    </td>
                    <td className="p-4 text-xs font-bold text-rose-400">
                      {member.membershipEnd ? `${getDaysOverdue(member.membershipEnd)} Days` : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSendReminder(member)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" /> Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
