import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  PhoneCall,
  History,
  Users,
  Coins,
  Award,
  IndianRupee,
  UserCheck,
  ClipboardList,
  QrCode,
  Settings2,
  X,
  Tag,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const superAdminLinks = [
    { to: '/app', label: 'Platform Stats', icon: LayoutDashboard },
    { to: '/app/owners', label: 'Gym Owners CRM', icon: Building2 },
    { to: '/app/leads', label: 'WhatsApp Leads', icon: PhoneCall },
    { to: '/app/subscription', label: 'Plan Subscription', icon: CreditCard },
    { to: '/app/coupons', label: 'Promo Coupons', icon: Tag },
    { to: '/app/audits', label: 'Global Audit Logs', icon: History }
  ];

  const gymOwnerLinks = [
    { to: '/app', label: 'Gym Dashboard', icon: LayoutDashboard },
    { to: '/app/members', label: 'Members Directory', icon: Users },
    { to: '/app/recovery', label: 'Pending Fee Recovery', icon: Coins },
    { to: '/app/plans', label: 'Membership Plans', icon: Award },
    { to: '/app/payments', label: 'Payments Tracker', icon: IndianRupee },
    { to: '/app/trainers', label: 'Trainer Schedules', icon: UserCheck },
    { to: '/app/workouts', label: 'Workout & Diets', icon: ClipboardList },
    { to: '/app/attendance', label: 'QR Scan check-in', icon: QrCode },
    { to: '/app/attendance-history', label: 'Attendance History', icon: History },
    { to: '/app/branding', label: 'Branding Settings', icon: Settings2 }
  ];

  const links = user?.role === 'super_admin' ? superAdminLinks : gymOwnerLinks;

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r bg-card transform transition-transform duration-300 md:translate-x-0 md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <span className="font-bold text-base text-primary uppercase tracking-wide">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2 h-[calc(100vh-65px)] overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/app'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
};
