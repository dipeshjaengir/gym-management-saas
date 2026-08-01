import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { COPYRIGHT } from '../utils/version';
import { 
  ArrowLeft, 
  Download, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  Cpu, 
  BookOpen, 
  Sparkles,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReleaseNotesData {
  version: string;
  build: number;
  releaseDate: string;
  changes: string[];
  bugFixes: string[];
}

interface MetadataData {
  version: string;
  build: number;
  releaseDate: string;
  releaseChannel: string;
  minAndroidVersion: string;
  fileSize: string;
  sha256: string;
  apkUrl: string;
  downloadUrl?: string;
  githubUrl?: string;
  backupUrl?: string;
}

export const DownloadAppPage: React.FC = () => {
  const navigate = useNavigate();
  const [apkStatus, setApkStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [installedVersion, setInstalledVersion] = useState<string>('');
  const [installedBuild, setInstalledBuild] = useState<number>(0);
  const [latestMetadata, setLatestMetadata] = useState<MetadataData | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotesData | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  
  // Custom Release Security and Health States
  const [downloadClicked, setDownloadClicked] = useState<boolean>(false);
  const [isLinkHealthy, setIsLinkHealthy] = useState<boolean | null>(null);
  const [isCheckingLink, setIsCheckingLink] = useState<boolean>(false);
  const [linkCheckError, setLinkCheckError] = useState<string>('');

  useEffect(() => {
    const fetchReleaseData = async () => {
      try {
        // 1. Fetch latest metadata
        const metadataResponse = await fetch('/downloads/metadata.json', { cache: 'no-cache' });
        if (!metadataResponse.ok) {
          setApkStatus('unavailable');
          return;
        }
        const metadata: MetadataData = await metadataResponse.json();
        setLatestMetadata(metadata);

        // 2. Fetch release notes
        const notesResponse = await fetch('/downloads/release-notes.json', { cache: 'no-cache' });
        if (notesResponse.ok) {
          const allNotes = await notesResponse.json();
          setReleaseNotes(allNotes[metadata.version] || null);
        }

        setApkStatus('available');

        // 3. CORS-Safe Link Verification
        if (metadata.githubUrl) {
          setIsCheckingLink(true);
          try {
            const checkRes = await fetch(`/api/check-download?url=${encodeURIComponent(metadata.githubUrl)}`);
            if (checkRes.ok) {
              const checkResult = await checkRes.json();
              if (
                checkResult.status === 200 &&
                (checkResult.contentType.includes('octet-stream') || checkResult.contentType.includes('android.package-archive')) &&
                checkResult.contentLength > 0
              ) {
                setIsLinkHealthy(true);
              } else {
                setIsLinkHealthy(false);
                setLinkCheckError(`Download asset verification failed (HTTP ${checkResult.status || 'invalid'})`);
              }
            } else {
              throw new Error('Check API returned non-200');
            }
          } catch (e) {
            console.error('Verify check failed:', e);
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              setIsLinkHealthy(true); // Local dev fallback
            } else {
              setIsLinkHealthy(false);
              setLinkCheckError('Temporarily unable to confirm download link status');
            }
          } finally {
            setIsCheckingLink(false);
          }
        }

        // 4. Detect installed version if running inside native app WebView
        try {
          const { App } = await import('@capacitor/app');
          const info = await App.getInfo();
          const currentVersion = info.version;
          const currentBuild = parseInt(info.build, 10);
          
          setInstalledVersion(currentVersion);
          setInstalledBuild(currentBuild);

          const latestBuild = parseInt(metadata.build.toString(), 10);
          if (latestBuild > currentBuild || isVersionNewer(metadata.version, currentVersion)) {
            setIsUpdateAvailable(true);
          }
        } catch (e) {
          // Silent catch: We are running in a regular web browser, not WebView
        }
      } catch (err) {
        console.error('Failed to load release assets:', err);
        setApkStatus('unavailable');
      }
    };

    fetchReleaseData();
  }, []);

  const isVersionNewer = (latest: string, installed: string) => {
    const latestParts = latest.split('.').map(Number);
    const installedParts = installed.split('.').map(Number);
    for (let i = 0; i < Math.max(latestParts.length, installedParts.length); i++) {
      const l = latestParts[i] || 0;
      const inst = installedParts[i] || 0;
      if (l > inst) return true;
      if (l < inst) return false;
    }
    return false;
  };

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
      <main className="w-full max-w-4xl flex flex-col md:flex-row items-start gap-8 my-10 z-10">
        {/* Left Side: Copy and Dynamic Release Notes */}
        <div className="flex-1 space-y-6 text-left self-stretch flex flex-col justify-between">
          <div className="space-y-4">
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
          </div>

          {/* Dynamic Release Notes Section */}
          {apkStatus === 'available' && releaseNotes && (
            <div className="p-5 rounded-2xl bg-card border border-muted/50 space-y-4 max-w-xl">
              <h3 className="font-bold text-sm tracking-tight border-b pb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> What's New in v{releaseNotes.version}
              </h3>
              
              {releaseNotes.changes && releaseNotes.changes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground">New Features:</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                    {releaseNotes.changes.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {releaseNotes.bugFixes && releaseNotes.bugFixes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground">Bug Fixes:</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                    {releaseNotes.bugFixes.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

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
          {apkStatus === 'available' && latestMetadata && (
            <div className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-foreground inline-flex items-center gap-1">
              <span>v{latestMetadata.version}</span>
              <span className="opacity-50">•</span>
              <span>Build {latestMetadata.build}</span>
            </div>
          )}
 
          {/* Download Action Button with Security and MIME Checks */}
          {apkStatus === 'available' && latestMetadata ? (
            <div className="w-full space-y-3">
              <a
                href={isLinkHealthy && latestMetadata.githubUrl ? latestMetadata.githubUrl : (latestMetadata.backupUrl || latestMetadata.downloadUrl || "/downloads/latest.apk")}
                download="GymLedger.apk"
                onClick={() => setDownloadClicked(true)}
                className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition-all cursor-pointer text-sm"
              >
                <Download className="w-4 h-4" /> 
                {isUpdateAvailable ? 'Update Available (Get APK)' : 'Download APK File'}
              </a>

              {/* Status and Health Telemetry */}
              <div className="text-[10px] text-left leading-relaxed px-1">
                {isCheckingLink ? (
                  <span className="text-muted-foreground animate-pulse">Checking link status...</span>
                ) : isLinkHealthy ? (
                  <span className="text-emerald-400 font-semibold">✓ Primary high-speed mirror active</span>
                ) : (
                  <div className="space-y-1">
                    <span className="text-amber-400 font-semibold block">⚠️ Primary mirror offline. Routing via backup mirror.</span>
                    {linkCheckError && (
                      <span className="text-[9px] text-muted-foreground block">Reason: {linkCheckError}</span>
                    )}
                  </div>
                )}
              </div>
              
              {downloadClicked && (
                <div className="text-[10px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border leading-relaxed text-left animate-in fade-in duration-300">
                  <span className="font-bold text-foreground block mb-1">Download started?</span>
                  If the download does not start automatically, please use the backup mirror or install the <strong>PWA Option</strong> below.
                </div>
              )}
            </div>
          ) : (
            <button
              disabled
              className="w-full h-12 bg-muted text-muted-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed text-sm border"
            >
              {apkStatus === 'checking' ? 'Checking APK availability...' : 'APK not available.'}
            </button>
          )}

          {/* Detailed Administrator Troubleshooting Message if APK is missing */}
          {apkStatus === 'unavailable' && (
            <div className="text-[11px] text-rose-500 font-semibold bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl w-full text-left space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span>⚠️ APK Release Unavailable</span>
              </div>
              <p className="text-[10px] font-normal leading-relaxed opacity-90 border-t border-rose-500/20 pt-2">
                <strong className="text-rose-400">Administrator Notice:</strong> The latest Android production build metadata was not found. 
                Please run the automated release pipeline script to compile and sign the release build:
              </p>
              <div className="bg-black/40 text-[9px] font-mono p-1.5 rounded border border-rose-500/30 overflow-x-auto text-rose-300">
                npm run build:apk
              </div>
              <p className="text-[9px] font-normal opacity-75">
                Ensure your keystore parameters are defined in <code className="bg-black/20 px-1 py-0.5 rounded">keystore.properties</code> (which is ignored by Git).
              </p>
            </div>
          )}

          {apkStatus === 'available' && latestMetadata && (
            <div className="w-full pt-4 border-t border-muted/30 space-y-2 text-left text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Release Channel:</span>
                <span className="font-semibold text-foreground">{latestMetadata.releaseChannel}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-semibold text-foreground">{latestMetadata.fileSize}</span>
              </div>
              <div className="flex justify-between">
                <span>Release Date:</span>
                <span className="font-semibold text-foreground">{latestMetadata.releaseDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Min Android Version:</span>
                <span className="font-semibold text-foreground">{latestMetadata.minAndroidVersion}</span>
              </div>
              {installedVersion && (
                <div className="flex justify-between border-t border-muted/20 pt-2 mt-2">
                  <span>Installed App:</span>
                  <span className="font-semibold text-primary">v{installedVersion} ({installedBuild})</span>
                </div>
              )}
              <div className="flex flex-col gap-1 border-t border-muted/20 pt-2 mt-2">
                <span className="text-[10px] opacity-80">SHA256 Checksum:</span>
                <span className="font-mono text-[9px] bg-muted px-1.5 py-1 rounded text-foreground overflow-x-auto select-all">
                  {latestMetadata.sha256}
                </span>
              </div>
            </div>
          )}
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
        <p>{COPYRIGHT} GymLedger SaaS. All rights reserved.</p>
      </footer>
    </div>
  );
};
