import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Dumbbell, ShieldAlert, Users, QrCode, PhoneCall, ArrowRight, Check } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { Link } from 'react-router-dom';

interface PricingPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
}

export const LandingPage: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const { showToast } = useNotification();

  // Inquiry Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await api.get('/public/plans');
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0].id);
      } catch (err) {
        showToast('Error loading subscription pricing details.', 'error');
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [showToast]);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !city) {
      showToast('Please fill out all fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/public/leads', {
        name,
        phone,
        city,
        interestedPlan: selectedPlan,
        source: 'website'
      });
      showToast(res.message || 'Demo request logged!', 'success');
      // Redirect gym owner to WhatsApp chat with Super Admin with prefilled text
      const planObj = plans.find(p => p.id === selectedPlan);
      const planName = planObj ? planObj.name : 'Gym Management Plan';
      const text = encodeURIComponent(`Hello, I want to purchase the ${planName} Gym Management Plan. My Gym is located in ${city}.`);
      // Simulating WhatsApp buy link
      const whatsappNumber = '919999999999'; // Default admin WhatsApp
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
      
      setName('');
      setPhone('');
      setCity('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit demo request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyPlan = (plan: PricingPlan) => {
    const text = encodeURIComponent(`Hello, I want to purchase the ${plan.name} (${plan.durationMonths} Month) Gym Management Plan.`);
    const whatsappNumber = '919999999999'; // Default Admin whatsapp
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      {/* Navbar Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-primary to-secondary rounded-xl text-white">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
              IronForge SaaS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-card border hover:bg-muted transition-all duration-200 text-foreground"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary tracking-wide uppercase">
            🇮🇳 Multi-Tenant Gym SaaS Platform
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Streamline Gym Collections &amp; <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Automate Expirations</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Empower your trainers, track members dues, auto-generate WhatsApp notification links, scan QR check-ins, and recover pending payments instantly.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="#pricing"
              className="px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              View Subscription Plans <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#demo"
              className="px-6 py-3 rounded-xl font-semibold bg-card border hover:bg-muted transition-all"
            >
              Book Free Demo
            </a>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-muted">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to scale your fitness studio</h2>
          <p className="mt-4 text-muted-foreground text-sm">
            Crafted for mobile convenience so gym owners and trainers can manage operations directly from their smartphones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300">
            <div className="p-3 w-fit bg-primary/10 rounded-xl text-primary mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Multi-Tenant Gym Branding</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Gym Owners customize their logo, contact details, address, and pre-formatted messaging templates for member notifications.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300">
            <div className="p-3 w-fit bg-secondary/10 rounded-xl text-secondary mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Instant QR Check-ins</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Provide dynamic digital passes to gym members. Check-ins simulator automatically logs entries, alerting owners of expired memberships.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border hover:border-primary/30 transition-all duration-300">
            <div className="p-3 w-fit bg-rose-500/10 rounded-xl text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Fee Recovery &amp; Dues Dashboard</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Instantly view overdue, unpaid, and upcoming renewals, sending WhatsApp payment click-to-chat links with prefilled text templates.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" className="py-20 bg-muted/30 border-t border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Flexible SaaS Subscription Pricing</h2>
            <p className="mt-4 text-muted-foreground text-sm">
              Manually activated by Super Admin after payment confirmation. No auto-charges or binding contracts.
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
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">₹{plan.price}</span>
                    <span className="text-xs text-muted-foreground">/ {plan.durationMonths} Mo</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground flex-grow">{plan.description}</p>
                  
                  <ul className="mt-6 space-y-3 text-xs text-foreground/80 flex-grow">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Manually Activated</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Full Multi-Tenant UI</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Overdue WhatsApp Reminders</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleBuyPlan(plan)}
                    className="mt-8 w-full py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    Buy Plan via WhatsApp <PhoneCall className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Demo Inquiry CRM Section */}
      <section id="demo" className="py-20 border-t border-muted">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-card border p-8 rounded-3xl relative">
            <h2 className="text-2xl font-bold text-center">Request a Live Demo</h2>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Interested in organizing your gym? Enter your contact information, and we will set up your portal instantly.
            </p>

            <form onSubmit={handleSubmitInquiry} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City / Location</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Plan of Interest</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {submitting ? 'Submitting...' : 'Register & Buy Now'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-muted bg-card">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} IronForge SaaS Gym Management. Built for gym studios across India.
        </div>
      </footer>
    </div>
  );
};
