import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { QrCode, ShieldCheck, ShieldAlert, Clock, UserCheck, Camera } from 'lucide-react';
import { exportToExcel } from '../../utils/exportHelpers';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Member {
  _id: string;
  name: string;
  qrCode: string;
  paymentStatus: string;
  remainingAmount: number;
}

interface LogEntry {
  _id: string;
  memberId: {
    name: string;
    phone: string;
    qrCode: string;
    gender: string;
  };
  checkInTime: string;
  date: string;
  status: string;
}

export const QRAttendanceSimulator: React.FC = () => {
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [useCamera, setUseCamera] = useState(false);

  // Scan Result Animation States
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const { showToast } = useNotification();

  useEffect(() => {
    if (!useCamera) return;
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    
    const onScanSuccess = (decodedText: string) => {
      handleSimulateScan(decodedText);
      setUseCamera(false); // Stop scanner
    };

    scanner.render(onScanSuccess, (err) => {});

    return () => {
      scanner.clear().catch((e) => console.error("Error clearing scanner", e));
    };
  }, [useCamera]);

  useEffect(() => {
    loadSimulatorData();
  }, []);

  const loadSimulatorData = async () => {
    try {
      const [membersData, logsData] = await Promise.all([
        api.get('/members'),
        api.get('/attendance/daily')
      ]);
      setMembers(membersData);
      setRecentLogs(logsData);
    } catch (err: any) {
      showToast('Error loading simulator datasets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = async (code: string) => {
    if (!code) {
      showToast('Please specify a QR pass code.', 'info');
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      const res = await api.post('/attendance/check-in', { qrCode: code });
      
      // Handle check-in outcome
      setScanResult({
        success: true,
        message: res.message || 'Access Granted!',
        details: `Scan recorded at ${res.attendance?.checkInTime || new Date().toLocaleTimeString()}`
      });
      showToast(res.message || 'Access Granted.', 'success');
      
      // Reload daily check-ins
      const logsData = await api.get('/attendance/daily');
      setRecentLogs(logsData);
      setQrCodeInput('');
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Access Denied.',
        details: err.data?.member?.status === 'expired' ? 'Membership plan is expired.' : 'No matching member found.'
      });
      showToast(err.message || 'Access Denied.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleExportExcel = () => {
    const formatted = recentLogs.map((log) => ({
      'Member Name': log.memberId?.name || 'N/A',
      'Contact Number': log.memberId?.phone || 'N/A',
      'QR Code Pass': log.memberId?.qrCode || 'N/A',
      'Gender': log.memberId?.gender || 'N/A',
      'Check-in Date': log.date,
      'Check-in Time': log.checkInTime,
      'Status': log.status.toUpperCase()
    }));
    exportToExcel(formatted, `daily_attendance_report_${new Date().toISOString().split('T')[0]}`, 'Attendance');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Attendance Simulator</h1>
        <p className="text-xs text-muted-foreground">Simulate scan entries using member QR Codes or selection shortcuts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scan Interface */}
          <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-primary" /> Scan Console
              </h2>
              <button
                onClick={() => setUseCamera((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  useCamera
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {useCamera ? 'Stop Camera' : 'Start Camera Scan'}
              </button>
            </div>

            {useCamera ? (
              <div className="space-y-4">
                <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border bg-black/5" />
                <p className="text-center text-xs text-muted-foreground animate-pulse">Position member QR Code within the scanning frame.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="Paste member QR Pass Code (e.g. QR-MEMBER-HASH)..."
                  className="flex-grow px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleSimulateScan(qrCodeInput)}
                  disabled={scanning}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-sm transition-all"
                >
                  {scanning ? 'Validating...' : 'Trigger Scan'}
                </button>
              </div>
            )}

            {/* Quick selectors shortcut */}
            <div className="space-y-2 pt-4 border-t">
              <span className="block text-xs font-semibold text-muted-foreground uppercase">Or select active member to scan:</span>
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              ) : members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active members registered to mock.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-background/50 border rounded-xl">
                  {members.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => handleSimulateScan(m.qrCode)}
                      className="px-3 py-1.5 rounded-lg border bg-card hover:border-primary text-xs transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{m.name}</span>
                      <code className="text-[10px] text-muted-foreground font-normal">({m.qrCode})</code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scan result display panel */}
          {scanResult && (
            <div
              className={`p-6 rounded-2xl border flex items-start gap-4 transition-all duration-300 animate-slide-in ${
                scanResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="p-3 rounded-xl bg-background/50 flex-shrink-0">
                {scanResult.success ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-rose-400" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className={`font-bold text-base ${scanResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {scanResult.success ? 'Access Granted' : 'Access Denied'}
                </h3>
                <p className="text-sm font-semibold">{scanResult.message}</p>
                <p className="text-xs opacity-80">{scanResult.details}</p>
              </div>
            </div>
          )}
        </div>

        {/* Daily Ticker Feed */}
        <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Today's Check-ins
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="text-[10px] bg-card hover:bg-muted border px-2 py-0.5 rounded font-semibold text-foreground transition-colors"
              >
                Excel
              </button>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                {recentLogs.length} entries
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No daily logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {recentLogs.map((log) => (
                <div key={log._id} className="p-3 rounded-xl bg-background border flex items-center justify-between text-xs hover:border-primary/30 transition-all">
                  <div className="space-y-1">
                    <div className="font-bold text-foreground">{log.memberId?.name || 'Member'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{log.memberId?.qrCode}</div>
                  </div>
                  <div className="text-right text-muted-foreground font-semibold">
                    {log.checkInTime}
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
