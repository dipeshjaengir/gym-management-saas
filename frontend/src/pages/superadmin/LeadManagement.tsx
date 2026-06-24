import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  PhoneCall,
  UserPlus,
  Building2,
  Trash2,
  Filter,
  MessageCircle,
  Plus,
  X
} from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  phone: string;
  city: string;
  interestedPlan: string;
  source: string;
  status: 'new' | 'contacted' | 'negotiation' | 'converted' | 'lost';
  createdAt: string;
}

export const LeadManagement: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { showToast } = useNotification();

  // Create Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [interestedPlan, setInterestedPlan] = useState('1_month');
  const [source, setSource] = useState('whatsapp');
  const [status, setStatus] = useState<'new' | 'contacted' | 'negotiation' | 'converted' | 'lost'>('new');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await api.get('/superadmin/leads');
      setLeads(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching leads list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !city) {
      showToast('All standard fields are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/superadmin/leads', {
        name,
        phone,
        city,
        interestedPlan,
        source,
        status
      });
      showToast('New platform lead registered.', 'success');
      setShowAddModal(false);
      setName('');
      setPhone('');
      setCity('');
      loadLeads();
    } catch (err: any) {
      showToast(err.message || 'Error adding new lead.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: Lead['status']) => {
    try {
      await api.put(`/superadmin/leads/${id}`, { status: nextStatus });
      showToast(`Lead status updated to: ${nextStatus.toUpperCase()}`, 'success');
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status: nextStatus } : l));
    } catch (err: any) {
      showToast(err.message || 'Failed to update lead status.', 'error');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/superadmin/leads/${id}`);
      showToast('Lead soft-deleted.', 'success');
      setLeads(prev => prev.filter(l => l._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete lead.', 'error');
    }
  };

  const handleWhatsAppContact = (lead: Lead) => {
    const formattedPhone = lead.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${lead.name}, this is GymLedger SaaS Admin. Let's discuss your interest in the ${lead.interestedPlan} plan for your gym!`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const filteredLeads = filterStatus === 'all'
    ? leads
    : leads.filter(l => l.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Lead CRM</h1>
          <p className="text-xs text-muted-foreground">Manage gym owners who contacted you for subscription inquiries.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md shadow-primary/10 w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4" /> Add CRM Lead
        </button>
      </div>

      {/* Filter and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Filter:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="negotiation">Negotiation</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filteredLeads.length}</span> lead entries
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No leads found in this category.</p>
        </div>
      ) : (
        /* Responsive Mobile Layout vs Desktop */
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredLeads.map((lead) => (
              <div key={lead._id} className="p-4 rounded-2xl bg-card border space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{lead.name}</span>
                  <select
                    value={lead.status}
                    onChange={(e) => handleUpdateStatus(lead._id, e.target.value as Lead['status'])}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${
                      lead.status === 'converted'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                        : lead.status === 'lost'
                        ? 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                        : 'bg-indigo-950/40 text-indigo-400 border-indigo-500/25'
                    }`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Phone: <span className="text-foreground">{lead.phone}</span></div>
                  <div>City: <span className="text-foreground">{lead.city}</span></div>
                  <div>Plan: <span className="text-foreground uppercase">{lead.interestedPlan}</span></div>
                  <div>Source: <span className="text-foreground capitalize">{lead.source}</span></div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleWhatsAppContact(lead)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    onClick={() => handleDeleteLead(lead._id)}
                    className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Lead Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Phone</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">City</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Plan</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Source</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-bold">{lead.name}</td>
                    <td className="p-4">{lead.phone}</td>
                    <td className="p-4">{lead.city}</td>
                    <td className="p-4 font-semibold uppercase">{lead.interestedPlan}</td>
                    <td className="p-4 capitalize">{lead.source}</td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead._id, e.target.value as Lead['status'])}
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${
                          lead.status === 'converted'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                            : lead.status === 'lost'
                            ? 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                            : 'bg-indigo-950/40 text-indigo-400 border-indigo-500/25'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="negotiation">Negotiation</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleWhatsAppContact(lead)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead._id)}
                        className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Lead Dialog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register New CRM Lead</h2>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Lead Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikramaditya Singh"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98980 98980"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">City / Gym Location</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Interested Plan</label>
                  <select
                    value={interestedPlan}
                    onChange={(e) => setInterestedPlan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="1_month">1 Month</option>
                    <option value="3_month">3 Month</option>
                    <option value="6_month">6 Month</option>
                    <option value="12_month">12 Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Lead Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website Demo</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Lead Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {submitting ? 'Adding...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
