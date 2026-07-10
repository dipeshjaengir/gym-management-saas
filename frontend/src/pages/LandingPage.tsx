// Trigger Vercel Production Build Redeployment
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ResponsiveModal } from '../components/ResponsiveModal';
import { APP_VERSION, mapPlanToEnum } from '../utils/version';
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
  ShieldCheck,
  Calendar,
  BarChart3,
  Database,
  IndianRupee,
  Sun,
  Moon,
  Clock,
  Lock,
  Zap
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  features?: string[];
}

export const LandingPage: React.FC = () => {
  const { loginWithToken } = useAuth();
  const { showToast } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Free Trial Modal State
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialGymName, setTrialGymName] = useState('');
  const [trialOwnerName, setTrialOwnerName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPassword, setTrialPassword] = useState('');
  const [trialConfirmPassword, setTrialConfirmPassword] = useState('');
  const [submittingTrial, setSubmittingTrial] = useState(false);

  // Demo Request Form State
  const [demoName, setDemoName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoCity, setDemoCity] = useState('');
  const [demoPlan, setDemoPlan] = useState('');
  const [submittingDemo, setSubmittingDemo] = useState(false);

  // Exit Intent Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitIntentTriggered, setExitIntentTriggered] = useState(false);

  // Active FAQ index state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Privacy & Terms Modal States
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Checkout Modal State
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<PricingPlan | null>(null);
  const [checkoutGymName, setCheckoutGymName] = useState('');
  const [checkoutOwnerName, setCheckoutOwnerName] = useState('');
  const [checkoutCoupon, setCheckoutCoupon] = useState('');
  const [discountApplied, setDiscountApplied] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    // 1. Fetch pricing plans
    async function fetchPlans() {
      try {
        const data = await api.get('/public/plans');
        const mapped = data.map((p: any) => ({ ...p, id: p._id }));
        setPlans(mapped);
      } catch (err) {
        showToast('Error loading subscription pricing details.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();

    // 2. Track exit intent (mouse leaving window bounds)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20 && !exitIntentTriggered) {
        setShowExitModal(true);
        setExitIntentTriggered(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [showToast, exitIntentTriggered]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName || !demoPhone || !demoCity) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(demoPhone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }

    const selectedPlanObj = plans.find(p => p.id === demoPlan);
    const interestedPlanEnum = selectedPlanObj ? mapPlanToEnum(selectedPlanObj.durationMonths) : undefined;

    setSubmittingDemo(true);
    try {
      const res = await api.post('/public/leads', {
        name: demoName,
        phone: demoPhone,
        city: demoCity,
        interestedPlan: interestedPlanEnum || undefined,
        source: 'website'
      });
      showToast(res.message || 'Demo request logged!', 'success');
      
      const text = encodeURIComponent(`Hello, I want to book a live demo for GymLedger Gym SaaS. My Gym is located in ${demoCity}.`);
      window.open(`https://wa.me/917742111581?text=${text}`, '_blank');
      
      setDemoName('');
      setDemoPhone('');
      setDemoCity('');
      setDemoPlan('');
    } catch (err: any) {
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        const msg = err.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        showToast(`Validation Error: ${msg}`, 'error');
      } else {
        showToast(err.message || 'Failed to submit demo request.', 'error');
      }
    } finally {
      setSubmittingDemo(false);
    }
  };

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialGymName || !trialOwnerName || !trialPhone || !trialEmail || !trialPassword || !trialConfirmPassword) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(trialPhone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trialEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    if (trialPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (!/[a-z]/.test(trialPassword)) {
      showToast('Password must contain at least one lowercase letter.', 'error');
      return;
    }
    if (!/[A-Z]/.test(trialPassword)) {
      showToast('Password must contain at least one uppercase letter.', 'error');
      return;
    }
    if (!/[0-9]/.test(trialPassword)) {
      showToast('Password must contain at least one number.', 'error');
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(trialPassword)) {
      showToast('Password must contain at least one special character.', 'error');
      return;
    }
    if (trialPassword !== trialConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setSubmittingTrial(true);
    try {
      const res = await api.post('/public/free-trial', {
        gymName: trialGymName,
        ownerName: trialOwnerName,
        phone: trialPhone,
        email: trialEmail,
        password: trialPassword,
        confirmPassword: trialConfirmPassword
      });
      
      showToast('Account setup complete! Logging you in...', 'success');
      loginWithToken(res.token, res.user);
      navigate('/app');
      setShowTrialModal(false);

      setTrialGymName('');
      setTrialOwnerName('');
      setTrialPhone('');
      setTrialEmail('');
      setTrialPassword('');
      setTrialConfirmPassword('');
    } catch (err: any) {
      if (err.data?.errors && Array.isArray(err.data.errors)) {
        const msg = err.data.errors.map((e: any) => `${e.field}: ${e.message}`).join(', ');
        showToast(`Validation Error: ${msg}`, 'error');
      } else {
        showToast(err.message || 'Failed to submit free trial request.', 'error');
      }
    } finally {
      setSubmittingTrial(false);
    }
  };

  const handleBuyPlan = (plan: PricingPlan) => {
    setSelectedCheckoutPlan(plan);
  };

  const handleValidateCoupon = async () => {
    if (!checkoutCoupon.trim()) return;
    setValidatingCoupon(true);
    try {
      const res = await api.post('/public/validate-coupon', { code: checkoutCoupon });
      if (res.valid) {
        setDiscountApplied(res.coupon);
        showToast(`Coupon applied! ${res.coupon.discountType === 'percentage' ? `${res.coupon.discountValue}% OFF` : `₹${res.coupon.discountValue} OFF`}`, 'success');
      } else {
        setDiscountApplied(null);
        showToast(res.message || 'Invalid coupon.', 'error');
      }
    } catch (err: any) {
      setDiscountApplied(null);
      showToast(err.message || 'Invalid coupon.', 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (!checkoutGymName.trim() || !checkoutOwnerName.trim()) {
      showToast('Gym Name and Owner Name are required.', 'error');
      return;
    }
    if (!selectedCheckoutPlan) return;

    const finalPrice = discountApplied 
      ? (discountApplied.discountType === 'percentage' 
          ? Math.round(selectedCheckoutPlan.price * (1 - discountApplied.discountValue / 100))
          : Math.max(0, selectedCheckoutPlan.price - discountApplied.discountValue))
      : selectedCheckoutPlan.price;

    const couponPart = discountApplied ? `Applied Coupon: ${checkoutCoupon.toUpperCase()} (${discountApplied.discountType === 'percentage' ? `${discountApplied.discountValue}% OFF` : `₹${discountApplied.discountValue} OFF`})` : 'Applied Coupon: None';

    const text = encodeURIComponent(
      `Hello GymLedger Team, I want to purchase a platform subscription plan.
- Gym Name: ${checkoutGymName}
- Owner Name: ${checkoutOwnerName}
- Selected Plan: ${selectedCheckoutPlan.name} (₹${selectedCheckoutPlan.price})
- ${couponPart}
- Total Price: ₹${finalPrice}`
    );

    window.open(`https://wa.me/917742111581?text=${text}`, '_blank');
    setSelectedCheckoutPlan(null);
    setCheckoutGymName('');
    setCheckoutOwnerName('');
    setCheckoutCoupon('');
    setDiscountApplied(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-white font-sans scroll-smooth">
      {/* Navbar */}
      <header className="border-b border-muted/50 bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground">
              GymLedger
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#workflow" className="hover:text-primary transition-all">Workflow</a>
            <a href="#features" className="hover:text-primary transition-all">Features</a>
            <a href="#interactive-tour" className="hover:text-primary transition-all">Guided Tour</a>
            <a href="#pricing" className="hover:text-primary transition-all">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-all">FAQ</a>
            <button onClick={() => navigate('/download-app')} className="hover:text-primary transition-all font-medium cursor-pointer">
              Download App
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-muted border border-muted/80 transition-all duration-200 text-foreground bg-background"
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

      {/* SECTION 1: Hero Section */}
      <section className="relative py-20 lg:py-32 px-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent border-b border-muted/30">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary tracking-wide uppercase animate-pulse">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Next-Gen SaaS for Fitness Centers
          </div>
          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground">
            The Complete Operating System <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
              For Modern Indian Gyms
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            GymLedger is an enterprise-grade cloud software that helps gym owners automate member check-ins, tracking payments, generating receipts, and recovering outstanding dues with WhatsApp click-to-chat automation.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowTrialModal(true)}
              className="px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              Start 7 Days Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#demo"
              className="px-6 py-3 rounded-xl font-bold bg-card border border-muted/80 hover:bg-muted text-foreground transition-all flex items-center gap-2 hover:scale-[1.02] shadow-sm justify-center"
            >
              Request Live Demo
            </a>
          </div>
        </div>
      </section>

      {/* SECTION 2: How GymLedger Works */}
      <section id="workflow" className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">How GymLedger Works</h2>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              Ditch complicated paperwork. Transition your business to our visual workflow in four simple phases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {[
              { step: 'Step 1', title: 'Register Your Gym', desc: 'Activate your isolated tenant portal instantly with customized branding and billing currency settings.' },
              { step: 'Step 2', title: 'Import Member Base', desc: 'Upload your old Excel roster using our synonym detector mapping wizard to configure member details in bulk.' },
              { step: 'Step 3', title: 'Track Active Check-ins', desc: 'Scan secure member pass QR codes at the receptionist desk using any smartphone or web browser camera.' },
              { step: 'Step 4', title: 'Collect Dues & Grow', desc: 'Identify outstanding fees, trigger dynamic WhatsApp payment reminders, and analyze collection statistics.' }
            ].map((s, idx) => (
              <div key={idx} className="bg-card border border-border/80 rounded-2xl p-6 relative flex flex-col justify-between hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">{s.step}</span>
                <h3 className="font-extrabold text-foreground text-base mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: Complete Member Management */}
      <section className="py-20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Active Directory</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Complete Member Management</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                GymLedger organizes your member roster in a secure, unified index directory. Instantly record emergency details, check active plans status, compute physical indicators, and review migration logs.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Full profile index featuring plan metadata status</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Integrated Body Mass Index (BMI) monitoring</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Dynamic member timelines logging payments & check-ins</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/members.png" alt="GymLedger Member Directory" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Smart QR Attendance */}
      <section className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/scanner.png" alt="GymLedger Attendance Scanner" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Webcam Direct Scanning</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Smart QR Attendance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Verify workouts entrance permissions directly in any browser using a webcam. Scan secure client passcards containing unique secure IDs. Automatically calculate duration timers and checkout times.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Fast camera direct scans (no separate scanner required)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Automated workout check-out duration calculation</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Multi-theme access status banners with beep synthesis</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Universal Member Import */}
      <section className="py-20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Universal Import Wizard</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Universal Member Migration</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Migrate historical data instantly. Upload any custom Excel file structure. Our mapper parses and auto-suggests header synonyms, dynamically lists all columns in dropdowns, and flags duplicate rows.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Dynamic synonym column suggestions detection</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> 5-point import validation overview stats card</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Inline spreadsheet rows correction & duplicate strategic skip</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/migration.png" alt="GymLedger Universal Migration Wizard" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Payment & Billing */}
      <section className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/ledger.png" alt="GymLedger Billing Receipts Ledger" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Financial Auditing</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Payment &amp; Billing Ledger</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage fees, collect installments, and record partial dues. Features transaction modification logs to safeguard financials against edits, and formats printable PDF receipts with branding variables.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Voided payments tracking with line-through audit logs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Multi-theme receipt panels featuring operator details</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Preformatted WhatsApp click-to-chat receipt triggers</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: Reports & Analytics */}
      <section className="py-20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Business Intelligence</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Reports &amp; Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Review financial collection trends, active subscription metrics, and scanner attendance statistics. Export transaction reports directly to custom excel spreadsheets for tax processing.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Interactive stats diagrams built via Recharts</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Export collections history logs to excel sheets</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Track monthly collection margins & expected dues</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/reports.png" alt="GymLedger Revenue & Attendance Analytics" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: Gym Configuration */}
      <section className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 rounded-2xl border border-muted/80 bg-card p-4 shadow-lg">
              <img src="/screenshots/dashboard.png" alt="GymLedger System Configurations console" className="rounded-xl w-full object-cover" loading="lazy" />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Settings &amp; Automation</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Platform Configurations</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Define membership packages, configure promo coupons, brand receipts with your studio logo, and set custom WhatsApp notification text templates for automated checkout billing.
              </p>
              <ul className="space-y-3.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Custom package packages configurations</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Integrated coupons manager with discount triggers</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary shrink-0" /> Receipts branding customize parameters</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: Multi-Tenant SaaS */}
      <section className="py-20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto mb-12 space-y-4">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Data Privacy Isolation</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">True Multi-Tenant SaaS</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every gym network operates on a strictly separated virtual database tenant context. Super Admin dashboard handles subscriptions, billing limits, and logs global health statuses, while Gym Owners only interact with their respective member records.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 10: Security */}
      <section className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Data Guard Protection</span>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Enterprise Security Stack</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We safeguard billing records, check-in data, and trainer credentials behind JWT token-based headers, password salting via bcrypt, and secure pass QR IDs displaying no personal details.
              </p>
            </div>
            <div className="p-6 bg-card border border-muted/50 rounded-2xl space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" /> Multi-Tenant Security Metrics
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-muted/30 pb-2">
                  <span>Transport Protocol</span>
                  <span className="font-bold text-foreground">HTTPS / TLS 1.3</span>
                </div>
                <div className="flex justify-between border-b border-muted/30 pb-2">
                  <span>Password Encrypter</span>
                  <span className="font-bold text-foreground">Bcrypt Salted</span>
                </div>
                <div className="flex justify-between border-b border-muted/30 pb-2">
                  <span>Session Key</span>
                  <span className="font-bold text-foreground">JWT Header Bearer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11: Why GymLedger */}
      <section className="py-20 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Why Choose GymLedger?</h2>
            <p className="mt-4 text-muted-foreground text-sm">
              The premier choice for fitness chains looking to maximize collection rates and secure entry gates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'No Installation Required', desc: 'Access your administrator dashboard from any mobile browser, tablet device, or desktop screen without installs.' },
              { icon: IndianRupee, title: 'Made For Indian Gyms', desc: 'Native support for UPI collections tracking, GST receipting, and local phone numbers formatting.' },
              { icon: MessageCircle, title: 'Dues Recovery WhatsApp', desc: 'Send outstanding balance notifications using customized WhatsApp template variables instantly.' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition-all flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 12: Guided Product Tour & Product Showcase */}
      <section id="interactive-tour" className="py-20 bg-muted/5 border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Guided Product Tour</span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mt-1">See How GymLedger Works</h2>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
              Understand our system flow in under 2 minutes. Tap cards below to preview our actual interface.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Register Gym', desc: 'Fill settings form to generate an admin password and configure subscription status.', img: '/screenshots/registration.png', benefit: 'Get 7-Day trial logged instantly' },
              { step: '02', title: 'Import Roster', desc: 'Upload spreadsheet rows, auto-map matching headers, and check validation indicators.', img: '/screenshots/migration.png', benefit: 'Migrate 5000+ rows in seconds' },
              { step: '03', title: 'View Directory', desc: 'Browse profiles in our unified directory showing statuses and contact cards.', img: '/screenshots/members.png', benefit: 'Check physical BMI indicators' },
              { step: '04', title: 'Generate passes', desc: 'Get printable PDF pass cards containing scannable secure QR codes.', img: '/screenshots/profile.png', benefit: 'No personal details exposed in QR' },
              { step: '05', title: 'Scan QR Code', desc: 'Log entries via any phone or laptop camera with access banners.', img: '/screenshots/scanner.png', benefit: 'Flags expired members instantly' },
              { step: '06', title: 'Collect Fees', desc: 'Record partial collections, void audits, and print receipt logs.', img: '/screenshots/ledger.png', benefit: 'Protects ledger against tampering' },
              { step: '07', title: 'Manage Dues', desc: 'View split reminders (Dues and Expiries) on dashboard cards.', img: '/screenshots/dashboard.png', benefit: 'WhatsApp remind in one click' },
              { step: '08', title: 'Analyze Analytics', desc: 'Track monthly revenue collections and check-in history charts.', img: '/screenshots/reports.png', benefit: 'Optimize growth and renew stats' }
            ].map((tour, idx) => (
              <div key={idx} className="group rounded-3xl bg-card border overflow-hidden flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                  <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-full">{tour.step}</span>
                  <span className="text-xs font-bold text-foreground">{tour.title}</span>
                </div>
                <div className="p-3 bg-background border-b relative overflow-hidden h-40">
                  <img src={tour.img} alt={tour.title} className="w-full h-full object-cover rounded-lg group-hover:scale-[1.04] transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tour.desc}</p>
                  <div className="pt-2 border-t border-border/40 text-[10px] font-bold text-indigo-400">
                    💡 Benefit: {tour.benefit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 border-b border-muted/30">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h2>
          <p className="mt-2 text-muted-foreground text-sm">Everything you need to know about setting up your gym.</p>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Can I import my existing members?', a: 'Yes. GymLedger has a Universal Import wizard. You can upload any CSV or Excel file and map columns to GymLedger fields using synonyms mapping. It automatically remembers your configuration for future uploads.' },
            { q: 'Does GymLedger support QR attendance?', a: 'Yes. It includes a dedicated browser camera stream scanner. Front desks can check in members using any laptop or smartphone webcam. Expired or archived members are instantly blocked.' },
            { q: 'Can I use it on mobile?', a: 'Yes. GymLedger is fully responsive and optimized for mobile, tablet, and desktop screens. You can manage your entire gym operations directly from your phone.' },
            { q: 'Is my gym data secure?', a: 'Yes. Every gym owner runs on an isolated tenant boundary. All login sessions are secured via JWT tokens, passwords are salted using bcrypt, and member QR codes contain no personal data.' },
            { q: 'Can I send WhatsApp reminders?', a: 'Yes. Pre-formatted click-to-chat links let you trigger payment reminders, welcome alerts, and receipts with name and due variables directly to members.' },
            { q: 'Can I manage multiple membership plans?', a: 'Yes. You can define custom packages, assign prices, durations, and manage coupon codes for renewals or active packages.' }
          ].map((item, idx) => (
            <div key={idx} className="bg-card border border-muted/50 rounded-2xl overflow-hidden transition-all duration-300">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full px-5 py-4 text-left font-bold text-sm text-foreground flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer"
              >
                <span>{item.q}</span>
                <span className="text-muted-foreground text-xs">{activeFaq === idx ? '▲' : '▼'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-muted/20 bg-background/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/5 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Affordable SaaS Subscription Plans</h2>
            <p className="mt-4 text-muted-foreground text-sm">
              All plans include complete client-management features, QR camera scan tools, and WhatsApp triggers.
            </p>
          </div>

          {loadingPlans ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => {
                const isPopular = index === 1;
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col p-8 rounded-3xl bg-card border transition-all duration-300 relative overflow-hidden hover:scale-[1.03] hover:shadow-2xl ${
                      isPopular
                        ? 'border-primary ring-4 ring-primary/10 shadow-xl shadow-primary/5 scale-[1.01]'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-xl tracking-wider">
                        Most Popular
                      </div>
                    )}
                    <h3 className="font-bold text-xl text-foreground">{plan.name}</h3>
                    <div className="mt-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground tracking-tight">₹{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/ {plan.durationMonths} Mo</span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground leading-relaxed flex-grow">{plan.description}</p>
                    
                    <ul className="mt-8 space-y-3.5 text-xs text-muted-foreground flex-grow border-t border-border pt-6">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-foreground">{f}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-foreground">Full Multi-Tenant Console</span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-foreground">Unlimited Members &amp; Trainers</span>
                          </li>
                        </>
                      )}
                    </ul>

                    <div className="mt-8 space-y-3">
                      <button
                        onClick={() => handleBuyPlan(plan)}
                        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs shadow-md bg-primary text-primary-foreground hover:bg-primary/95`}
                      >
                        Buy Plan via WhatsApp <PhoneCall className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowTrialModal(true)}
                        className="w-full py-3 rounded-xl font-semibold bg-transparent border border-border hover:bg-muted text-foreground transition-all text-xs"
                      >
                        Start Free Trial
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Demo request inquiry */}
      <section id="demo" className="py-20 max-w-md mx-auto px-4">
        <div className="bg-card border border-muted/50 p-8 rounded-3xl relative">
          <h2 className="text-2xl font-bold text-center text-foreground">Book a Live Demo</h2>
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
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={demoPhone}
                onChange={(e) => setDemoPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
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
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan of Interest (Optional)</label>
              <select
                value={demoPlan}
                onChange={(e) => setDemoPlan(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-muted bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
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
              className="w-full mt-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submittingDemo ? 'Submitting...' : 'Register & Book Demo'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-xs text-muted-foreground">
          <div className="space-y-3">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-primary transition-colors">Core Console</a></li>
              <li><a href="#interactive-tour" className="hover:text-primary transition-colors">Guided Tour</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing Options</a></li>
              <li><button onClick={() => navigate('/download-app')} className="hover:text-primary transition-colors cursor-pointer text-left">Android App</button></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Features</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-primary transition-colors">QR check-ins</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">Excel Import</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">Due Reminders</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Company</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="hover:text-primary transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="hover:text-primary transition-colors cursor-pointer text-left"
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Contact Us</h4>
            <ul className="space-y-2">
              <li><a href="mailto:dipeshjangir010@gmail.com" className="hover:text-primary">dipeshjangir010@gmail.com</a></li>
              <li><a href="https://wa.me/917742111581" target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp Live</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center text-xs footer-text flex flex-col items-center justify-center space-y-1 border-t border-border pt-6">
          <p>{APP_VERSION.copyright} SaaS Gym Management.</p>
          <p>
            Designed & Developed by{' '}
            <span className="text-[#F59E0B] font-semibold">Dipesh Jangir</span>
          </p>
          <p className="text-[10px] opacity-75 mt-0.5">Version {APP_VERSION.version} (Build {APP_VERSION.build})</p>
        </div>
      </footer>

      {/* MODALS */}
      {/* Privacy Policy Modal */}
      <ResponsiveModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
        maxWidthClass="max-w-lg"
        footer={
          <button
            onClick={() => setShowPrivacyModal(false)}
            className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs rounded-xl cursor-pointer"
          >
            Understood
          </button>
        }
      >
        <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
          <p><strong>Effective Date: June 28, 2026</strong></p>
          <p>At GymLedger SaaS, we prioritize the confidentiality and integrity of your gym data. This Privacy Policy details how we handle the database files, user logins, and member information.</p>
          <p><strong>1. Isolated Boundaries</strong>: All gym tenants run on strictly isolated databases. Neither other gym owners nor platform operators can view member rosters, contact details, or financial receipts without authorization.</p>
          <p><strong>2. Member Data Privacy</strong>: Member QR codes do not store names, photos, or membership metrics in clear text. They contain only a randomized pass token verified locally on scan.</p>
          <p><strong>3. Security Standards</strong>: Passwords are encrypted using bcrypt and database connections use Secure Sockets Layer (SSL) encryption protocols.</p>
        </div>
      </ResponsiveModal>

      {/* Terms & Conditions Modal */}
      <ResponsiveModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms &amp; Conditions"
        maxWidthClass="max-w-lg"
        footer={
          <button
            onClick={() => setShowTermsModal(false)}
            className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs rounded-xl cursor-pointer"
          >
            Accept Terms
          </button>
        }
      >
        <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
          <p><strong>Effective Date: June 28, 2026</strong></p>
          <p>By registering a Gym Owner console account on GymLedger, you agree to comply with these terms of use.</p>
          <p><strong>1. Billing &amp; Subscription</strong>: Owner subscriptions are billed monthly or annually. Accounts are suspended automatically if renewal payments fail after a 7-day grace period.</p>
          <p><strong>2. Fair Usage</strong>: File imports and barcode check-ins must comply with fair-use limits. Owners are responsible for the correctness of files uploaded to the column mapping wizard.</p>
          <p><strong>3. Liability</strong>: GymLedger provides the software management portal "as is". We are not responsible for direct or indirect losses arising from member attendance disputes or invoice print errors.</p>
        </div>
      </ResponsiveModal>

      {/* Exit Intent Modal */}
      <ResponsiveModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Before you go..."
        maxWidthClass="max-w-md"
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={() => {
                setShowExitModal(false);
                setShowTrialModal(true);
              }}
              className="flex-1 h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 text-xs text-center transition-all cursor-pointer"
            >
              Claim Free Trial
            </button>
            <button
              onClick={() => setShowExitModal(false)}
              className="flex-1 h-11 rounded-xl font-semibold bg-transparent border border-muted hover:bg-muted text-xs text-center transition-all text-foreground cursor-pointer"
            >
              No Thanks
            </button>
          </div>
        }
      >
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-450 tracking-wide uppercase">
              Special Offer ⚠️
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get instant access to member rosters, scan simulators, dues trackers, and billing calculators. Start your 7 days free trial right now — no payment details required!
          </p>
        </div>
      </ResponsiveModal>

      {/* Free Trial Signup Modal */}
      <form onSubmit={handleTrialSubmit}>
        <ResponsiveModal
          isOpen={showTrialModal}
          onClose={() => setShowTrialModal(false)}
          title="Start 7-Day Free Trial"
          subtitle="Get instant access to your gym console. No credit card required."
          maxWidthClass="max-w-md"
          footer={
            <button
              type="submit"
              disabled={submittingTrial}
              className="w-full h-11 rounded-xl font-bold bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer disabled:opacity-50"
            >
              {submittingTrial ? 'Configuring Portal...' : 'Start Trial Now'} <ArrowRight className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym / Studio Name</label>
              <input
                type="text"
                required
                value={trialGymName}
                onChange={(e) => setTrialGymName(e.target.value)}
                placeholder="e.g. GymLedger Club"
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
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
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
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
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={trialEmail}
                onChange={(e) => setTrialEmail(e.target.value)}
                placeholder="e.g. contact@gymledger.com"
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={trialPassword}
                onChange={(e) => setTrialPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Password must be at least 6 characters and include a mix of uppercase, lowercase, numbers, and special characters.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={trialConfirmPassword}
                onChange={(e) => setTrialConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </ResponsiveModal>
      </form>

      {/* Checkout Modal */}
      <form onSubmit={(e) => { e.preventDefault(); handleWhatsAppCheckout(); }}>
        <ResponsiveModal
          isOpen={!!selectedCheckoutPlan}
          onClose={() => {
            setSelectedCheckoutPlan(null);
            setCheckoutGymName('');
            setCheckoutOwnerName('');
            setCheckoutCoupon('');
            setDiscountApplied(null);
          }}
          title="Purchase Plan via WhatsApp"
          subtitle="Complete setup details to generate your purchase link."
          maxWidthClass="max-w-md"
          footer={
            selectedCheckoutPlan && (
              <button
                type="submit"
                className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 text-xs text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Confirm &amp; Buy via WhatsApp <PhoneCall className="w-4 h-4" />
              </button>
            )
          }
        >
          {selectedCheckoutPlan && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gym Name</label>
                <input
                  type="text"
                  required
                  value={checkoutGymName}
                  onChange={(e) => setCheckoutGymName(e.target.value)}
                  placeholder="e.g. GymLedger Club"
                  className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={checkoutOwnerName}
                  onChange={(e) => setCheckoutOwnerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Applied Coupon</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkoutCoupon}
                    onChange={(e) => setCheckoutCoupon(e.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    className="flex-grow h-11 px-4 rounded-xl border border-muted bg-background text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none uppercase font-bold text-center tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={validatingCoupon}
                    className="px-4 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 cursor-pointer min-h-[44px]"
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
                {discountApplied && (
                  <p className="text-xs text-emerald-400 font-bold mt-1.5 animate-pulse">
                    ✓ Coupon Applied! Discount: {discountApplied.discountType === 'percentage' ? `${discountApplied.discountValue}% OFF` : `₹${discountApplied.discountValue} OFF`}
                  </p>
                )}
              </div>

              <div className="border-t border-muted/30 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Plan Price</span>
                  <span>₹{selectedCheckoutPlan.price}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between text-xs text-emerald-400 font-medium animate-fade-in">
                    <span>Discount</span>
                    <span>
                      -₹
                      {discountApplied.discountType === 'percentage'
                        ? Math.round(selectedCheckoutPlan.price * (discountApplied.discountValue / 100))
                        : discountApplied.discountValue}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-foreground border-t border-muted/20 pt-2">
                  <span>Total Amount</span>
                  <span>
                    ₹
                    {discountApplied
                      ? Math.max(
                          0,
                          selectedCheckoutPlan.price -
                            (discountApplied.discountType === 'percentage'
                              ? Math.round(selectedCheckoutPlan.price * (discountApplied.discountValue / 100))
                              : discountApplied.discountValue)
                        )
                      : selectedCheckoutPlan.price}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ResponsiveModal>
      </form>
    </div>
  );
};
