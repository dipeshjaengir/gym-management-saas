import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { QrCode, ShieldCheck, ShieldAlert, Clock, UserCheck, Camera, LogIn, LogOut } from 'lucide-react';
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
  checkOutTime?: string;
  workoutDuration?: string;
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
  const [scanMode, setScanMode] = useState<'check-in' | 'check-out'>('check-in');

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

  const handleToggleCamera = async () => {
    if (!useCamera) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setUseCamera(true);
        } else {
          showToast('Media devices not supported on this browser/device.', 'error');
        }
      } catch (err: any) {
        showToast('Camera Permission Denied: Please enable camera access in your browser settings to scan QR.', 'error');
      }
    } else {
      setUseCamera(false);
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
      const endpoint = scanMode === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
      const res = await api.post(endpoint, { qrCode: code });
      
      const timeStr = scanMode === 'check-in' 
        ? res.attendance?.checkInTime 
        : res.attendance?.checkOutTime;

      const extraDetails = scanMode === 'check-out' && res.attendance?.workoutDuration
        ? ` | Workout Duration: ${res.attendance.workoutDuration}`
        : '';

      setScanResult({
        success: true,
        message: res.message || `${scanMode === 'check-in' ? 'Check-In' : 'Check-Out'} Successful!`,
        details: `${scanMode === 'check-in' ? 'Checked In' : 'Checked Out'} at ${timeStr || new Date().toLocaleTimeString()}${extraDetails}`
      });
      showToast(res.message || `${scanMode === 'check-in' ? 'Check-In' : 'Check-Out'} Successful.`, 'success');
      
      // Reload daily check-ins
      const logsData = await api.get('/attendance/daily');
      setRecentLogs(logsData);
      setQrCodeInput('');
    } catch (err: any) {
      let detailsMsg = err.message || 'Scan processing failure.';
      if (err.status === 404) {
        detailsMsg = 'Invalid QR: Member QR Code not found.';
      } else if (err.status === 400) {
        detailsMsg = err.message || 'Scan constraint violation.';
      } else if (err.status === 403) {
        detailsMsg = err.message || 'Access Denied: Membership expired.';
      }
      
      setScanResult({
        success: false,
        message: `${scanMode === 'check-in' ? 'Check-In' : 'Check-Out'} Denied`,
        details: detailsMsg
      });
      showToast(err.message || 'Scan Denied.', 'error');
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
      'Check-out Time': log.checkOutTime || 'N/A',
      'Workout Duration': log.workoutDuration || 'N/A',
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-primary" /> Scan Console
              </h2>
              
              {/* Scan Mode Toggle Switches */}
              <div className="flex bg-muted/60 p-1 rounded-xl w-full sm:w-60 shadow-inner">
                <button
                  type="button"
                  onClick={() => setScanMode('check-in')}
                  className={`flex-grow py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    scanMode === 'check-in'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" /> Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('check-out')}
                  className={`flex-grow py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    scanMode === 'check-out'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" /> Check-Out
                </button>
              </div>

              <button
                onClick={handleToggleCamera}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                  placeholder={`Paste member QR Pass Code to ${scanMode === 'check-in' ? 'check-in' : 'check-out'}...`}
                  className="flex-grow px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleSimulateScan(qrCodeInput)}
                  disabled={scanning}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  {scanning ? 'Validating...' : 'Trigger Scan'}
                </button>
              </div>
            )}

            {/* Quick selectors shortcut */}
            <div className="space-y-2 pt-4 border-t">
              <span className="block text-xs font-semibold text-muted-foreground uppercase">
                Or select active member to {scanMode === 'check-in' ? 'check-in' : 'check-out'}:
              </span>
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
                      className="px-3 py-1.5 rounded-lg border bg-card hover:border-primary text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
                className="text-[10px] bg-card hover:bg-muted border px-2 py-0.5 rounded font-semibold text-foreground transition-colors cursor-pointer"
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
                <div key={log._id} className="p-3 rounded-xl bg-background border flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:border-primary/30 transition-all gap-2">
                  <div className="space-y-1">
                    <div className="font-bold text-foreground">{log.memberId?.name || 'Member'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{log.memberId?.qrCode}</div>
                    {log.workoutDuration && (
                      <div className="text-[9px] text-primary font-bold">Duration: {log.workoutDuration}</div>
                    )}
                  </div>
                  <div className="text-right text-muted-foreground font-semibold flex flex-col items-end">
                    <div>In: {log.checkInTime}</div>
                    {log.checkOutTime && <div className="text-amber-400">Out: {log.checkOutTime}</div>}
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
