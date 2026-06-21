import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Shield, Clock, ShieldCheck, Globe, Search } from 'lucide-react';

interface Audit {
  _id: string;
  action: string;
  user: string;
  timestamp: string;
  ipAddress: string;
}

export const AuditLogs: React.FC = () => {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useNotification();

  useEffect(() => {
    async function loadAudits() {
      try {
        const data = await api.get('/superadmin/audits');
        setAudits(data);
      } catch (err: any) {
        showToast(err.message || 'Error fetching audit logs.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAudits();
  }, [showToast]);

  const filteredAudits = audits.filter(
    (audit) =>
      audit.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.ipAddress.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Audit Logs</h1>
        <p className="text-xs text-muted-foreground">Immutable trail of critical actions performed across the SaaS platform.</p>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by action keyword, operator email, or client IP..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none"
        />
      </div>

      {/* Audit List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No matching audit logs recorded.</p>
        </div>
      ) : (
        <>
          {/* Card List for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredAudits.map((audit) => (
              <div key={audit._id} className="p-4 rounded-xl bg-card border space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                    {audit.action}
                  </span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Operator: <span className="text-foreground">{audit.user}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Time: <span className="text-foreground">{new Date(audit.timestamp).toLocaleString('en-IN')}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>IP Address: <span className="text-foreground">{audit.ipAddress || '127.0.0.1'}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Timestamp</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Operator User</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">System Action</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Client IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredAudits.map((audit) => (
                  <tr key={audit._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-semibold text-xs text-muted-foreground">
                      {new Date(audit.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-medium text-foreground">{audit.user}</td>
                    <td className="p-4 font-bold text-xs uppercase tracking-wide text-primary">{audit.action}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{audit.ipAddress || '127.0.0.1'}</td>
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
