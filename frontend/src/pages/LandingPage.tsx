import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  ShieldAlert,
  Users,
  QrCode,
  ArrowRight,
  Check,
  PhoneCall,
  MessageCircle,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  Database,
  Smartphone,
  IndianRupee
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

export const LandingPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Free Trial Modal State
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialGymName, setTrialGymName] = useState('');
  const [trialOwnerName, setTrialOwnerName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialCity, setTrialCity] = useState('');
  const [submittingTrial, setSubmittingTrial] = useState(false);
  
  // Trial Success State
  const [trialSuccessData, setTrialSuccessData] = useState<{
    email: string;
    password: string;
    token: string;
    user: any;
  } | null>(null);

  // Demo Request Form State
  const [demoName, setDemoName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoCity, setDemoCity] = useState('');
  const [demoPlan, setDemoPlan] = useState('');
  const [submittingDemo, setSubmittingDemo] = useState(false);

  // Exit Intent Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitIntentTriggered, setExitIntentTriggered] = useState(false);

  // Sticky CTA State
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    // 1. Fetch pricing plans
    async function fetchPlans() {
      try {
        const data = await api.get('/public/plans');
        setPlans(data);
      } catch (err) {
        showToast('Error loading subscription pricing details.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();

    // 2. Track scroll to show sticky CTA
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyCta(true);
      } else {
        setShowStickyCta(false);
      }
    };
    window.addEventListener('scroll', handleScroll);

    // 3. Track exit intent (mouse leaving window bounds)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20 && !exitIntentTriggered) {
        setShowExitModal(true);
        setExitIntentTriggered(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [showToast, exitIntentTriggered]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName || !demoPhone || !demoCity) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    setSubmittingDemo(true);
    try {
      const res = await api.post('/public/leads', {
        name: demoName,
        phone: demoPhone,
        city: demoCity,
        interestedPlan: demoPlan || undefined,
        source: 'website'
      });
      showToast(res.message || 'Demo request logged!', 'success');
      
      // Open WhatsApp chat
      const planObj = plans.find(p => p.id === demoPlan);
      const planName = planObj ? planObj.name : 'Gym Management SaaS';
      const text = encodeURIComponent(`Hello, I want to book a live demo for IronForge Gym SaaS. My Gym is located in ${demoCity}.`);
      window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
      
      setDemoName('');
      setDemoPhone('');
      setDemoCity('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit demo request.', 'error');
    } finally {
      setSubmittingDemo(false);
    }
  };

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialGymName || !trialOwnerName || !trialPhone || !trialEmail || !trialCity) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    setSubmittingTrial(true);
    try {
      const res = await api.post('/public/free-trial', {
        gymName: trialGymName,
        ownerName: trialOwnerName,
        phone: trialPhone,
        email: trialEmail,
        city: trialCity
      });
      
      showToast('Account setup complete! Save your credentials.', 'success');
      setTrialSuccessData({
        email: res.email,
        password: res.password,
        token: res.token,
        user: res.user
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to sign up for free trial.', 'error');
    } finally {
      setSubmittingTrial(false);
    }
  };

  const handleAutoLogin = () => {
    if (trialSuccessData) {
      loginWithToken(trialSuccessData.token, trialSuccessData.user);
      navigate('/gymowner');
    }
  };

  const handleDemoDashboard = async () => {
    try {
      showToast('Logging in to Demo Dashboard...', 'info');
      const res = await api.post('/auth/login', {
        email: 'owner@ironforge.com',
        password: 'owner123'
      });
      if (res.token && res.user) {
        loginWithToken(res.token, res.user);
        showToast('Logged in successfully!', 'success');
        navigate('/gymowner');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to login to demo dashboard.', 'error');
    }
  };

  const handleBuyPlan = (plan: PricingPlan) => {
    const text = encodeURIComponent(`Hello, I want to purchase the ${plan.name} (${plan.durationMonths} Months) subscription plan for IronForge Gym SaaS.`);
    window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-white font-sans scroll-smooth">
      {/* 1. Navbar / Header */}
      <header className="border-b border-muted/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-primary to-indigo-500 rounded-xl text-white">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              IronForge SaaS
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-all">Features</a>
            <a href="#comparison" className="hover:text-primary transition-all">Comparison</a>
            <a href="#pricing" className="hover:text-primary transition-all">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-all">FAQ</a>
            <a href="#demo" className="hover:text-primary transition-all">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-muted border border-muted/80 transition-all duration-200"
            >
              Login
            </button>
            <button
              onClick={() => setShowTrialModal(true)}
              className="hidden sm:inline-block px-4 py-2 text-sm font-bold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative py-20 lg:py-32 px-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent border-b border-muted/30">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary tracking-wide uppercase animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Made for India Gyms 🇮🇳
          </div>
          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
            India's Smart Gym <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-400 to-purple-500">
              Management Software
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Manage members, register trainers, assign workout/diet plans, scan QR codes, track payments/outstanding balances, and recover dues with pre-formatted WhatsApp click-to-chat links.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowTrialModal(true)}
              className="px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              Start 7 Days Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDemoDashboard}
              className="px-6 py-3 rounded-xl font-bold bg-card border border-muted/80 hover:bg-muted text-foreground transition-all flex items-center gap-2"
            >
              Try Demo Dashboard <ExternalLink className="w-4 h-4" />
            </button>
            <a
              href="#demo"
              className="px-6 py-3 rounded-xl font-semibold text-muted-foreground hover:text-white transition-all flex items-center justify-center"
            >
              Book a Demo
            </a>
          </div>

          {/* Trust Badges */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center border-t border-muted/30 mt-12">
            <div className="space-y-1">
              <span className="block text-2xl font-bold text-white">100%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Multi-Tenant Isolated</span>
            </div>
            <div className="space-y-1">
              <span className="block text-2xl font-bold text-white">₹0</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Setup Fees Required</span>
            </div>
            <div className="space-y-1">
              <span className="block text-2xl font-bold text-white">Instant</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">WhatsApp Link Triggers</span>
            </div>
            <div className="space-y-1">
              <span className="block text-2xl font-bold text-white">Secured</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">TLS &amp; Rate-Limited</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dashboard Previews (Tailwind-Built Actual Platform Components) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-muted/30">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Inside the Platform</h2>
          <p className="mt-4 text-muted-foreground text-sm">
            Experience our premium dark-mode interface built to run seamlessly on mobile, tablet, and desktop screens.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card A: Gym Owner Dashboard Mockup */}
          <div className="p-6 rounded-2xl bg-card border border-muted/50 shadow-lg relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between border-b border-muted/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Gym Owner Console Preview</span>
            </div>

            {/* Simulated UI components */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-background border border-muted/50 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Members</span>
                <div className="text-2xl font-extrabold text-white flex items-center gap-1.5">
                  142 <span className="text-xs font-semibold text-emerald-400 font-sans">+12%</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-background border border-muted/50 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Monthly Collection</span>
                <div className="text-2xl font-extrabold text-white">₹78,500</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" /> Pending Collections
                </span>
                <span className="text-xs font-bold text-rose-400">₹14,500 Due</span>
              </div>
              <div className="space-y-2 text-xs text-foreground/80">
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                  <span>Rohan Sharma (Due ₹1,500)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold uppercase">WhatsApp Remind</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                  <span>Karan Malhotra (Due ₹2,500)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold uppercase">WhatsApp Remind</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: QR Scanning Console Mockup */}
          <div className="p-6 rounded-2xl bg-card border border-muted/50 shadow-lg relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between border-b border-muted/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Attendance Scanning Preview</span>
            </div>

            {/* QR Scan Status Feed Simulation */}
            <div className="flex flex-col items-center justify-center p-6 bg-background rounded-xl border border-muted/50 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative overflow-hidden">
                <QrCode className="w-12 h-12 text-emerald-400" />
                <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 animate-bounce"></div>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Access Granted: Present
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Member: Rohan Sharma | Expiry: 15-Sep-2026</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Logs</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-background/50 border border-muted/30">
                  <span className="font-semibold text-white">Anjali Desai</span>
                  <span className="text-[10px] text-muted-foreground">08:45 AM</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background/50 border border-muted/30">
                  <span className="font-semibold text-white">Rahul Patel</span>
                  <span className="text-[10px] text-rose-400">08:12 AM (Expired Plan)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Comparison Section (Manual vs. SaaS) */}
      <section id="comparison" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-muted/30">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Manual Gym Logs vs. Smart Gym SaaS</h2>
          <p className="mt-4 text-muted-foreground text-sm">
            Discover why gym networks are transitioning from spreadsheets to automated cloud directories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Manual Management */}
          <div className="p-6 rounded-2xl bg-card border border-rose-500/20 shadow-sm relative overflow-hidden space-y-4">
            <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
              ❌ Manual Gym Tracking
            </h3>
            <ul className="space-y-3 text-xs text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                <span>Writing billing collections in notebooks or lost registers.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                <span>No track of member expirations unless manually reviewed card-by-card.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                <span>Calling members individually to request outstanding balances.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0"></span>
                <span>Zero attendance monitoring, leading to non-members exploiting equipment.</span>
              </li>
            </ul>
          </div>

          {/* SaaS Management */}
          <div className="p-6 rounded-2xl bg-card border border-primary/20 shadow-sm relative overflow-hidden space-y-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              💪 IronForge Gym SaaS
            </h3>
            <ul className="space-y-3 text-xs text-foreground/90">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Instant invoices logged in Mongo database with printable receipts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Automatic status flags toggle expired accounts to restrict check-ins.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Pre-formatted WhatsApp click-to-chat links with dynamic parameters.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>QR pass check-ins scanner instantly logs entries on dynamic dashboards.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Core Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-muted/30">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Full-Featured Management Console</h2>
          <p className="mt-4 text-muted-foreground text-sm">
            IronForge comes equipped with all tools required to streamline collections and satisfy customers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-primary/10 rounded-xl text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Member Onboarding</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track physical stats, assign membership end-dates, calculate BMI, and log contact directories easily.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-indigo-500/10 rounded-xl text-indigo-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">QR Attendance Scanner</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Accept camera check-ins using html5-qrcode. Expired members are automatically flagged to block entry.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-amber-500/10 rounded-xl text-amber-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Payment Tracker</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Log payments made via cash, card, UPI, or bank transfer. Print PDF receipts and export history to Excel.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-emerald-500/10 rounded-xl text-emerald-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">WhatsApp Alerts</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Manual WhatsApp links compile pre-formatted templates with names and outstanding dues for quick reminder triggers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-purple-500/10 rounded-xl text-purple-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Workout &amp; Diet Charts</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Assign daily exercise routines, meal plans, and target calorie intake trackers directly to members.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300 space-y-3">
            <div className="p-3 w-fit bg-rose-500/10 rounded-xl text-rose-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Revenue Reports</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compile monthly earnings, active memberships status counts, expected renewals, and export logs to Excel sheets.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Pricing Plans Section */}
      <section id="pricing" className="py-20 bg-muted/20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">Affordable SaaS Subscription Plans</h2>
            <p className="mt-4 text-muted-foreground text-sm">
              All plans include complete client-management features, QR camera scan tools, and WhatsApp triggers.
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all duration-300 relative overflow-hidden"
                >
                  <h3 className="font-bold text-lg text-white">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/ {plan.durationMonths} Mo</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground flex-grow">{plan.description}</p>
                  
                  <ul className="mt-6 space-y-3 text-xs text-foreground/80 flex-grow border-t border-muted/30 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Full Multi-Tenant Console</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Unlimited Members &amp; Trainers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Excel &amp; PDF Exports</span>
                    </li>
                  </ul>

                  <div className="mt-8 space-y-2">
                    <button
                      onClick={() => handleBuyPlan(plan)}
                      className="w-full py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      Buy Plan via WhatsApp <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowTrialModal(true)}
                      className="w-full py-2.5 rounded-xl font-semibold bg-transparent border border-muted hover:bg-muted text-foreground transition-all text-xs"
                    >
                      Start Free Trial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Data Security Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-muted/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="p-2 w-fit bg-emerald-500/10 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Enterprise Grade Security &amp; Isolation</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every gym network operates on strict multi-tenant boundary parameters. Your member directories, financial receipt logs, and trainer profiles are locked behind hashed authorization tokens.
            </p>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="w-4 h-4 text-emerald-400" /> Secure bcrypt password salting.
              </li>
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="w-4 h-4 text-emerald-400" /> Rate-limiting to protect against DDoS/brute-force attacks.
              </li>
              <li className="flex items-center gap-2 text-foreground/80">
                <Check className="w-4 h-4 text-emerald-400" /> Automated cloud database backup clusters.
              </li>
            </ul>
          </div>
          <div className="p-6 bg-card border border-muted/50 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-primary" /> Data Storage Parameters
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-muted/30 pb-2">
                <span>Encryption Protocol</span>
                <span className="font-bold text-white">TLS 1.3</span>
              </div>
              <div className="flex justify-between border-b border-muted/30 pb-2">
                <span>Auth Handshake</span>
                <span className="font-bold text-white">JWT Bearer Keys</span>
              </div>
              <div className="flex justify-between border-b border-muted/30 pb-2">
                <span>Database Engine</span>
                <span className="font-bold text-white">MongoDB Cloud Cluster</span>
              </div>
              <div className="flex justify-between">
                <span>Daily Backup</span>
                <span className="font-bold text-white">Automatic Snapshots</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Testimonials Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-muted/30">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Trusted by Gym Owners</h2>
          <p className="mt-4 text-muted-foreground text-sm">
            Read how other fitness owners improved cash flow and collection recovery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-card border border-muted/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                VK
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Vijay Krish</h4>
                <p className="text-[10px] text-muted-foreground">Owner, Gold Gym Delhi</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "We recovered over ₹25,000 in outstanding dues within our first week. The preformatted WhatsApp reminders allow our receptionist to send alerts in just one click."
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-muted/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-400">
                SD
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Sunita Desai</h4>
                <p className="text-[10px] text-muted-foreground">Manager, Titan Fitness Mumbai</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "The dynamic QR check-in simulator works like a charm. It immediately flags members who have expired plans, preventing them from entry until they renew."
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-muted/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                RK
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Rohan Kapoor</h4>
                <p className="text-[10px] text-muted-foreground">Founder, Elite Arena Bangalore</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "The interface is so clean. The mobile view is incredibly responsive, enabling us to run our front desk and check member logs straight from our phones."
            </p>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 border-b border-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
          <p className="mt-2 text-muted-foreground text-sm">Everything you need to know about setting up your gym.</p>
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-card border border-muted/50 space-y-2">
            <h4 className="font-bold text-sm text-white">How does the 7-day free trial work?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clicking "Start Free Trial" lets you register immediately. Our backend instantly configures a 7-day trial subscription and displays your login password. You can automatically log in with a single click.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-muted/50 space-y-2">
            <h4 className="font-bold text-sm text-white">How do WhatsApp notifications function?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We compile your client balance parameters (names, due dates, outstanding fees) and prefill a WhatsApp link. Clicking the reminder button opens WhatsApp with the message ready to send. No setup or manual typing needed.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-muted/50 space-y-2">
            <h4 className="font-bold text-sm text-white">Is our member data secure?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes. All user sessions are locked behind JSON Web Tokens (JWT), passwords are salted using bcrypt, and database collections are strictly isolated to guarantee multi-tenant security boundary locks.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-muted/50 space-y-2">
            <h4 className="font-bold text-sm text-white">How do we scan QR check-in codes?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Members receive a unique printable PDF pass card containing a QR code. Your front desk receptionist can scan the QR code using any smartphone or tablet camera directly through our browser-based scanner interface.
            </p>
          </div>
        </div>
      </section>

      {/* 10. Demo request inquiry (Move existing form to bottom) */}
      <section id="demo" className="py-20 max-w-md mx-auto px-4">
        <div className="bg-card border border-muted/50 p-8 rounded-3xl relative">
          <h2 className="text-2xl font-bold text-center text-white">Book a Live Demo</h2>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Still have questions? Enter your contact information, and we will get back to you within 24 hours.
          </p>

          <form onSubmit={handleDemoSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Your Name</label>
              <input
                type="text"
                required
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={demoPhone}
                onChange={(e) => setDemoPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City / Location</label>
              <input
                type="text"
                required
                value={demoCity}
                onChange={(e) => setDemoCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan of Interest (Optional)</label>
              <select
                value={demoPlan}
                onChange={(e) => setDemoPlan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">Select Plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submittingDemo}
              className="w-full mt-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-indigo-500 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submittingDemo ? 'Submitting...' : 'Register & Book Demo'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-muted/50 bg-card">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} IronForge SaaS Gym Management. Built for gym studios across India.
        </div>
      </footer>

      {/* ========================================== */}
      {/* MODALS & FLOATING WIDGETS */}
      {/* ========================================== */}

      {/* A. Sticky Bottom CTA (Mobile/Tablet scroll indicator) */}
      {showStickyCta && (
        <div className="fixed bottom-0 inset-x-0 bg-card/95 border-t border-muted/80 backdrop-blur px-4 py-3 z-40 flex items-center justify-between sm:hidden shadow-lg transition-all duration-300">
          <span className="text-xs font-bold text-white">Start 7 Days Free Trial</span>
          <button
            onClick={() => setShowTrialModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow"
          >
            Start Free Trial
          </button>
        </div>
      )}

      {/* B. Floating WhatsApp Contact Bubble */}
      <a
        href="https://wa.me/919999999999?text=Hello!+I+am+interested+in+a+live+demo+of+IronForge+Gym+Management+SaaS."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 z-45 transition-all hover:scale-110 flex items-center justify-center group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute right-14 bg-card border border-muted/50 text-white text-[10px] font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow">
          Chat with Sales
        </span>
      </a>

      {/* C. Exit Intent Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-muted/50 p-8 rounded-3xl max-w-md w-full relative space-y-6">
            <button
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 tracking-wide uppercase">
                Special Offer ⚠️
              </span>
              <h3 className="text-2xl font-bold text-white">Before you go...</h3>
              <p className="text-xs text-muted-foreground">
                Get instant access to member portals, scan simulators, dues trackers, and billing calculators. Start your 7 days free trial right now — no payment details required!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setShowTrialModal(true);
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 text-xs text-center transition-all"
              >
                Claim Free Trial
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold bg-transparent border border-muted hover:bg-muted text-xs text-center transition-all"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. Free Trial Signup & Success Modal */}
      {showTrialModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-muted/50 p-6 rounded-3xl max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowTrialModal(false);
                setTrialSuccessData(null);
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {!trialSuccessData ? (
              // Trial Sign Up Form
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold text-white">Start 7-Day Free Trial</h3>
                  <p className="text-xs text-muted-foreground">
                    Get instant access to your gym console. No credit card required.
                  </p>
                </div>

                <form onSubmit={handleTrialSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym / Studio Name</label>
                    <input
                      type="text"
                      required
                      value={trialGymName}
                      onChange={(e) => setTrialGymName(e.target.value)}
                      placeholder="e.g. Iron Muscle Gym"
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={trialOwnerName}
                      onChange={(e) => setTrialOwnerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Number (WhatsApp)</label>
                    <input
                      type="tel"
                      required
                      value={trialPhone}
                      onChange={(e) => setTrialPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={trialEmail}
                      onChange={(e) => setTrialEmail(e.target.value)}
                      placeholder="e.g. contact@irongym.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City / Location</label>
                    <input
                      type="text"
                      required
                      value={trialCity}
                      onChange={(e) => setTrialCity(e.target.value)}
                      placeholder="e.g. Pune"
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTrial}
                    className="w-full mt-4 py-3 rounded-xl font-bold bg-gradient-to-r from-primary to-indigo-500 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                  >
                    {submittingTrial ? 'Configuring Portal...' : 'Start Trial Now'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              // Trial Success & Credentials Display
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Your Trial is Active!</h3>
                  <p className="text-xs text-muted-foreground">
                    Copy and save your generated temporary credentials to access your console in the future.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-muted/50 space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans font-semibold mb-0.5">Login Email</span>
                    <span className="text-white select-all font-bold">{trialSuccessData.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans font-semibold mb-0.5">Temporary Password</span>
                    <span className="text-primary select-all font-bold">{trialSuccessData.password}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 flex gap-2.5 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Important:</span> These credentials have been logged in the platform database AuditLogs. You can change your password at any time inside your branding profiles dashboard settings.
                  </div>
                </div>

                <button
                  onClick={handleAutoLogin}
                  className="w-full py-3.5 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  Access Dashboard Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
