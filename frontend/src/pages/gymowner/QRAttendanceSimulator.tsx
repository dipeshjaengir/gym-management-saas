import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Clock,
  UserCheck,
  Camera,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  RefreshCw,
  User,
  Activity,
  AlertTriangle,
  Award
} from 'lucide-react';
import { exportToExcel } from '../../utils/exportHelpers';
import { Html5Qrcode } from 'html5-qrcode';

interface Member {
  _id: string;
  name: string;
  qrCode: string;
  isArchived: boolean;
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
  const [scanMode, setScanMode] = useState<'auto' | 'check-in' | 'check-out'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera devices
  const [cameraDevices, setCameraDevices] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);

  // Scan Result Screen
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    type?: 'check-in' | 'check-out' | 'failure';
    message: string;
    member?: {
      name: string;
      phone: string;
      planName: string;
      membershipEnd: string;
      remainingDays: number;
      gender: string;
    };
    time?: string;
    duration?: string;
    duesWarning?: string;
  } | null>(null);

  const { showToast } = useNotification();

  // Load baseline statistics & history
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
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

  // Browser Direct camera scanner initialization
  useEffect(() => {
    // 1. Fetch available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameraDevices(devices);
          // Auto-select back camera if mobile or first camera
          const backCam = devices.find((d) => d.label.toLowerCase().includes('back'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          showToast('No camera devices found.', 'info');
        }
      })
      .catch((err) => {
        console.error('Camera retrieval failed:', err);
      });
  }, []);

  // Continuous Camera Stream loop
  useEffect(() => {
    if (!selectedCameraId) return;

    const html5QrCode = new Html5Qrcode('reader');
    setCameraActive(true);

    let lastScanTime = 0;
    let lastScanText = '';

    html5QrCode
      .start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanText && now - lastScanTime < 3000) {
            // Anti-bounce rapid double scan trigger
            return;
          }
          lastScanText = decodedText;
          lastScanTime = now;
          handleQRScan(decodedText);
        },
        (errorMessage) => {
          // Quiet scanner logs
        }
      )
      .catch((err) => {
        console.error('Failed to start continuous camera scanner:', err);
        setCameraActive(false);
      });

    return () => {
      setCameraActive(false);
      html5QrCode.stop().catch(() => {});
    };
  }, [selectedCameraId]);

  // Audio oscillator feedback beep helper
  const playBeep = (type: 'success' | 'failure') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error('Audio synthesis failed', e);
    }
  };

  // Perform QR Scanner backend check-in/check-out workflow
  const handleQRScan = async (code: string) => {
    if (!code) return;
    setScanning(true);
    setScanResult(null);

    try {
      // Select endpoint dynamically: Auto mode calls /scan, otherwise /check-in or /check-out
      let endpoint = '/attendance/scan';
      if (scanMode === 'check-in') endpoint = '/attendance/check-in';
      if (scanMode === 'check-out') endpoint = '/attendance/check-out';

      const res = await api.post(endpoint, { qrCode: code });
      playBeep('success');

      setScanResult({
        success: true,
        type: res.type,
        message: res.message || 'Scan completed successfully.',
        member: res.member,
        time: res.attendance?.checkInTime || res.attendance?.checkOutTime || new Date().toLocaleTimeString(),
        duration: res.attendance?.workoutDuration,
        duesWarning: res.member?.remainingDays === 0 ? 'Dues Outstanding' : undefined
      });

      showToast(res.message || 'Scan succeeded.', 'success');

      // Reload baseline logs
      const dailyLogs = await api.get('/attendance/daily');
      setRecentLogs(dailyLogs);
      setQrCodeInput('');
    } catch (err: any) {
      playBeep('failure');
      let detailsMsg = err.message || 'Verification failed.';
      
      // Fallback details mapping for failure banners
      if (err.status === 404) detailsMsg = 'QR Pass Code invalid or unknown member.';
      if (err.status === 403) detailsMsg = err.message || 'Access Denied: Expired subscription.';
      if (err.status === 400) detailsMsg = err.message || 'Rule Violation: Duplicate scan entry.';

      setScanResult({
        success: false,
        type: 'failure',
        message: detailsMsg,
        member: err.response?.data?.member || (err.member ? err.member : undefined)
      });

      showToast(detailsMsg, 'error');
    } finally {
      setScanning(false);
    }
  };

  // Export Daily logs
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

  // Stats calculation
  const totalCheckedIn = recentLogs.length;
  const totalCheckedOut = recentLogs.filter((log) => log.checkOutTime && log.checkOutTime !== '').length;
  const expiredMembersCount = members.filter((m) => {
    // Determine expired memberships count
    const memberObj: any = m;
    if (!memberObj.membershipEnd) return false;
    return new Date(memberObj.membershipEnd) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-indigo-500 animate-pulse" /> QR Attendance Scanner
          </h1>
          <p className="text-xs text-muted-foreground">Dedicated real-time browser camera console for check-ins, check-outs & live analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 border rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title={soundEnabled ? 'Disable Audio Beeps' : 'Enable Audio Beeps'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button
            onClick={loadDashboardData}
            className="p-2 border rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live counters top dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-2xl bg-card shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Present Today</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-extrabold text-foreground">{totalCheckedIn}</span>
            <LogIn className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div className="p-4 border rounded-2xl bg-card shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Checked Out</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-extrabold text-foreground">{totalCheckedOut}</span>
            <LogOut className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div className="p-4 border rounded-2xl bg-card shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Expired Members</span>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-extrabold text-rose-500">{expiredMembersCount}</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
        </div>
        <div className="p-4 border rounded-2xl bg-card shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Scanner Engine</span>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400">Html5-QRCode</span>
            <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left scanning console */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div className="space-y-1">
                <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-400" /> Camera Feed
                </h2>
                <p className="text-[11px] text-muted-foreground">Select camera input source below for continuous QR decoding.</p>
              </div>

              {/* Mode toggles */}
              <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-80 border border-muted shadow-inner text-[10px] font-bold">
                {[
                  { id: 'auto', label: 'Auto Detect' },
                  { id: 'check-in', label: 'In Only' },
                  { id: 'check-out', label: 'Out Only' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setScanMode(m.id as any)}
                    className={`flex-grow py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      scanMode === m.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Select dropdown */}
            {cameraDevices.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase">Camera Source</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full text-xs p-2.5 border rounded-xl bg-background text-foreground focus:outline-none"
                >
                  {cameraDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Real Webcam container frame */}
            <div className="relative border rounded-2xl overflow-hidden bg-black aspect-video max-w-lg mx-auto flex items-center justify-center shadow-inner">
              <div id="reader" className="w-full h-full" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/10 p-4 text-center space-y-2">
                  <Camera className="w-8 h-8 text-muted-foreground/50 animate-bounce" />
                  <p className="text-xs text-muted-foreground font-semibold">Camera loading or permission denied.</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs">Enable camera permissions in your browser or choose a different device.</p>
                </div>
              )}
            </div>

            {/* Manual input simulation code if webcam not supported/offline */}
            <div className="space-y-3 pt-4 border-t">
              <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
                Simulated Scanner Trigger (Offline Backup)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="Enter Secure QR Code..."
                  className="flex-grow px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                />
                <button
                  onClick={() => handleQRScan(qrCodeInput)}
                  disabled={scanning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  {scanning ? 'Decoding...' : 'Mock Scan'}
                </button>
              </div>

              {/* Roster list selection links */}
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
              ) : members.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No members enrolled.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-background/50 border rounded-xl">
                  {members.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => handleQRScan(m.qrCode)}
                      className="px-2 py-1 rounded-lg border bg-card hover:border-indigo-500 text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3 text-muted-foreground" />
                      <span>{m.name}</span>
                      <code className="text-[9px] text-muted-foreground font-mono">({m.qrCode})</code>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side live ticker & dynamic success screen */}
        <div className="lg:col-span-4 space-y-6">
          {/* Scan result screen */}
          <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4 min-h-[250px] flex flex-col justify-center">
            {scanResult ? (
              <div className="space-y-4 animate-slide-in">
                {/* Banner Header */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    scanResult.success
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}
                >
                  {scanResult.success ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider font-bold block opacity-80">
                      {scanResult.success ? 'Scan Success' : 'Scan Failure'}
                    </span>
                    <h3 className="font-bold text-xs">{scanResult.message}</h3>
                  </div>
                </div>

                {/* Member Profiler info */}
                {scanResult.member ? (
                  <div className="p-4 border rounded-xl bg-muted/10 space-y-4">
                    <div className="flex items-center gap-3">
                      {/* Initials Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                        {scanResult.member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-foreground">{scanResult.member.name}</h4>
                        <span className="text-[10px] text-muted-foreground block font-mono">{scanResult.member.phone}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px] pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Plan Name</span>
                        <strong className="text-foreground">{scanResult.member.planName}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Remaining Days</span>
                        <span
                          className={`font-bold ${
                            scanResult.member.remainingDays <= 7 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'
                          }`}
                        >
                          {scanResult.member.remainingDays} days
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Expiry Date</span>
                        <strong className="text-foreground">{scanResult.member.membershipEnd}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[9px] uppercase">Action Time</span>
                        <span className="text-indigo-400 font-bold">{scanResult.time}</span>
                      </div>
                    </div>

                    {scanResult.duration && (
                      <div className="p-2 border border-indigo-500/20 bg-indigo-950/20 text-indigo-300 font-bold rounded-lg text-center text-[10px]">
                        Workout Session Duration: {scanResult.duration}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-rose-400 border border-rose-500/10 rounded-xl bg-rose-950/5">
                    No member context linked to this failure.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3 py-10">
                <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-muted-foreground">Waiting for Scan...</h3>
                  <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
                    Continuous scanner is active. Scan or mock a QR code to display user attendance profile instantly.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Today's Ticker stream activity */}
          <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" /> Attendance Feed
              </h2>
              <button
                onClick={handleExportExcel}
                className="text-[9px] bg-muted hover:bg-muted/80 border px-2 py-0.5 rounded font-bold text-foreground transition-all cursor-pointer"
              >
                Export CSV
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="py-12 text-center text-[10px] text-muted-foreground border border-dashed rounded-xl">
                No scans recorded today.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {recentLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-2.5 rounded-xl bg-muted/10 border text-[10px] flex items-center justify-between hover:border-indigo-500/20 transition-all gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground truncate max-w-[120px]">{log.memberId?.name || 'Member'}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">{log.memberId?.qrCode}</div>
                      {log.workoutDuration && (
                        <div className="text-[9px] text-emerald-400 font-bold">Duration: {log.workoutDuration}</div>
                      )}
                    </div>
                    <div className="text-right text-[9px] text-muted-foreground font-semibold flex flex-col items-end">
                      <span className="text-indigo-400 font-bold">In: {log.checkInTime}</span>
                      {log.checkOutTime && <span className="text-amber-400 font-bold">Out: {log.checkOutTime}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
