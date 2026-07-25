import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { APP_VERSION } from '../utils/version';
import { 
  ArrowLeft, 
  Download, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  Cpu, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DownloadAppPage: React.FC = () => {
  const navigate = useNavigate();
  const [apkStatus, setApkStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [apkSize, setApkSize] = useState<string>('~4.5 MB');

  useEffect(() => {
    const checkApkAvailability = async () => {
      try {
        const response = await fetch('/GymLedger.apk', { method: 'HEAD' });
        const contentType = response.headers.get('content-type') || '';
        
        // If Vercel rewrote to index.html (content-type includes text/html), the file is missing
        if (response.ok && !contentType.includes('text/html')) {
          setApkStatus('available');
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const bytes = parseInt(contentLength, 10);
            if (!isNaN(bytes)) {
              setApkSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
            }
          }
        } else {
          setApkStatus('unavailable');
        }
      } catch (err) {
        setApkStatus('unavailable');
      }
    };

    checkApkAvailability();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all group bg-card border px-3 py-1.5 rounded-full cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Home
        </button>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            GymLedger
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-8 my-10 z-10">
        {/* Left Side: Copy and Details */}
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-primary/15 border border-primary/20 text-primary uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Official Android Release
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Manage your Gym on the go with{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              GymLedger Mobile
            </span>
          </h1>
          
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Carry your entire member registry in your pocket. Access the instant camera QR scanner, run attendance simulations, review pending dues, and trigger automated WhatsApp notifications anywhere, anytime.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-card border">
              <QrCode className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <div className="font-bold text-xs">QR Scanner</div>
                <div className="text-[10px] text-muted-foreground">Speed check-ins</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-card border">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div>
                <div className="font-bold text-xs">Secure Offline</div>
                <div className="text-[10px] text-muted-foreground">Stored telemetry cache</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Download Card */}
        <div className="w-full md:w-80 p-6 rounded-3xl bg-card border border-muted/50 shadow-xl space-y-6 text-center relative flex flex-col items-center">
          <div className="p-3 bg-primary/10 rounded-full">
            <Smartphone className="w-8 h-8 text-primary animate-bounce" />
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-lg">GymLedger Android</h3>
            <p className="text-xs text-muted-foreground">Stable APK Package</p>
          </div>

          {/* Version Pill */}
          <div className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-foreground inline-flex items-center gap-1">
            <span>{APP_VERSION.version}</span>
            <span className="opacity-50">•</span>
            <span>Build {APP_VERSION.build}</span>
          </div>

          {/* Download Action Button */}
          {apkStatus === 'available' ? (
            <a
              href="/GymLedger.apk"
              download="GymLedger.apk"
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition-all cursor-pointer text-sm"
            >
              <Download className="w-4 h-4" /> Download APK File
            </a>
          ) : (
            <button
              disabled
              className="w-full h-12 bg-muted text-muted-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed text-sm border"
            >
              {apkStatus === 'checking' ? 'Checking APK availability...' : 'APK not available.'}
            </button>
          )}

          {apkStatus === 'unavailable' && (
            <p className="text-[11px] text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl w-full">
              ⚠️ Android APK is temporarily unavailable.
            </p>
          )}

          <div className="w-full pt-4 border-t border-muted/30 space-y-2 text-left text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>File Name:</span>
              <span className="font-semibold text-foreground">GymLedger.apk</span>
            </div>
            <div className="flex justify-between">
              <span>File Size:</span>
              <span className="font-semibold text-foreground">{apkSize}</span>
            </div>
            <div className="flex justify-between">
              <span>Release Date:</span>
              <span className="font-semibold text-foreground">{APP_VERSION.releaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-semibold text-foreground">{APP_VERSION.releaseDate}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Guide Section */}
      <section className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-border/60 z-10 text-left">
        <div className="p-5 rounded-2xl bg-card border space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> Android Installation Guide
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
            <li>Click the <strong className="text-foreground">Download APK</strong> button to save the file.</li>
            <li>If prompted, approve downloads from "Unknown Sources" in your mobile browser settings.</li>
            <li>Open the downloaded <code className="text-primary font-bold">GymLedger.apk</code> file in your Downloads folder.</li>
            <li>Tap <strong className="text-foreground">Install</strong> and launch the app to sign in.</li>
          </ol>
        </div>

        <div className="p-5 rounded-2xl bg-card border space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> iOS / Chrome PWA Option
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Alternatively, GymLedger is also a Progressive Web App (PWA). You can install it directly on any iOS or Android device without downloads:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
            <li>Open the website <strong className="text-foreground">gymledger.in</strong> in Safari (iOS) or Chrome (Android).</li>
            <li>Tap the <strong className="text-foreground">Share</strong> icon (iOS) or browser menu (Android).</li>
            <li>Select <strong className="text-foreground">Add to Home Screen</strong>.</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-[10px] text-muted-foreground pt-12 z-10">
        <p>{APP_VERSION.copyright} GymLedger SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
};
