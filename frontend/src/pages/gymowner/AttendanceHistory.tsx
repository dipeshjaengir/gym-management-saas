import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { exportToCSV } from '../../utils/exportHelpers';
import { Download, Calendar, Search, History, Clock } from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  memberId: {
    _id: string;
    name: string;
    phone: string;
    qrCode: string;
    gender: string;
  } | null;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  receptionist?: string;
  qrScanTime?: string;
  deviceInfo?: string;
  status: 'present' | 'absent';
}

export const AttendanceHistory: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { showToast } = useNotification();

  const getDatesForFilter = (filterType: 'today' | 'week' | 'month' | 'custom') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filterType === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }
    if (filterType === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString().split('T')[0], endDate: todayStr };
    }
    if (filterType === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString().split('T')[0], endDate: todayStr };
    }
    return { startDate: customStart, endDate: customEnd };
  };

  const loadAttendance = async (filterType = activeFilter) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDatesForFilter(filterType);
      let queryUrl = '/attendance/history';
      const params: string[] = [];

      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);

      if (params.length > 0) {
        queryUrl += `?${params.join('&')}`;
      }

      const data = await api.get(queryUrl);
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || 'Error loading attendance history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeFilter !== 'custom') {
      loadAttendance(activeFilter);
    }
  }, [activeFilter]);

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      showToast('Please select both start and end dates.', 'info');
      return;
    }
    loadAttendance('custom');
  };

  const getDuration = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return 'Active Session';
    try {
      const [inH, inM, inS] = checkIn.split(':').map(Number);
      const [outH, outM, outS] = checkOut.split(':').map(Number);

      const inDate = new Date(2000, 0, 1, inH, inM, inS || 0);
      const outDate = new Date(2000, 0, 1, outH, outM, outS || 0);

      let diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs < 0) return 'N/A'; // overnight or invalid check-out

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      diffMs %= 1000 * 60 * 60;
      const minutes = Math.floor(diffMs / (1000 * 60));

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes} mins`;
    } catch (e) {
      return 'N/A';
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast('No records available to export.', 'info');
      return;
    }

    const data = records.map((r) => ({
      Date: r.date,
      'Member Name': r.memberId?.name || 'N/A',
      Phone: r.memberId?.phone || 'N/A',
      'Check In': r.checkInTime,
      'Check Out': r.checkOutTime || 'Active',
      Duration: getDuration(r.checkInTime, r.checkOutTime),
      Receptionist: r.receptionist || 'Admin',
      'QR Scan Time': r.qrScanTime || 'N/A',
      Device: r.deviceInfo || 'N/A',
      Status: r.status.toUpperCase()
    }));

    exportToCSV(data, `attendance_report_${activeFilter}`);
    showToast('Attendance report exported successfully.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Ledger</h1>
          <p className="text-xs text-muted-foreground">Monitor and audit daily check-in scans, sessions, and reception logs.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filter and Date Selectors */}
      <div className="p-4 rounded-2xl bg-card border space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {(['today', 'week', 'month', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                    : 'bg-background hover:bg-muted border-border text-muted-foreground'
                }`}
              >
                {filter === 'today' && 'Today'}
                {filter === 'week' && 'This Week'}
                {filter === 'month' && 'This Month'}
                {filter === 'custom' && 'Custom Date Range'}
              </button>
            ))}
          </div>

          {/* Custom Date Picker Fields */}
          {activeFilter === 'custom' && (
            <form onSubmit={handleCustomSearch} className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-muted-foreground">From:</label>
                <input
                  type="date"
                  required
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border bg-background text-foreground focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-muted-foreground">To:</label>
                <input
                  type="date"
                  required
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border bg-background text-foreground focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/95 shadow cursor-pointer"
              >
                Search
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Records List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <History className="w-8 h-8 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No Logs Found</p>
          <p className="text-xs text-muted-foreground mt-1">There are no gym attendance entries recorded for the selected range.</p>
        </div>
      ) : (
        <>
          {/* Mobile Layout */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {records.map((rec) => (
              <div key={rec._id} className="p-4 rounded-xl bg-card border space-y-2 shadow-sm text-xs">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <span className="font-bold text-foreground">{rec.memberId?.name || 'N/A'}</span>
                  <span className="text-[10px] text-muted-foreground">{rec.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>Check In: <span className="text-foreground font-semibold">{rec.checkInTime}</span></div>
                  <div>Check Out: <span className="text-foreground font-semibold">{rec.checkOutTime || 'Active'}</span></div>
                  <div>Duration: <span className="text-primary font-bold">{getDuration(rec.checkInTime, rec.checkOutTime)}</span></div>
                  <div>Operator: <span className="text-foreground font-medium">{rec.receptionist || 'Admin'}</span></div>
                  <div>Scan Time: <span className="text-foreground font-medium">{rec.qrScanTime || 'N/A'}</span></div>
                  <div className="col-span-2 text-[10px] truncate">Device: {rec.deviceInfo || 'Unknown'}</div>
                </div>
                <div className="pt-1 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold uppercase text-[8px] border border-emerald-500/20">
                    {rec.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Check In</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Check Out</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Duration</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Receptionist</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">QR Scan Time</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-medium text-xs text-muted-foreground">{rec.date}</td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{rec.memberId?.name || 'N/A'}</div>
                      <div className="text-[10px] text-muted-foreground">{rec.memberId?.phone || 'N/A'}</div>
                    </td>
                    <td className="p-4 font-mono font-semibold text-xs">{rec.checkInTime}</td>
                    <td className="p-4 font-mono text-xs">{rec.checkOutTime || '-'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${rec.checkOutTime ? 'text-primary' : 'text-emerald-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {getDuration(rec.checkInTime, rec.checkOutTime)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground font-medium">{rec.receptionist || 'Admin'}</td>
                    <td className="p-4 text-xs text-muted-foreground font-mono">{rec.qrScanTime || 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold uppercase text-[9px] border border-emerald-500/20">
                        {rec.status.toUpperCase()}
                      </span>
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
