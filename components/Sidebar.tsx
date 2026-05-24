import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { ICONS } from '../constants.tsx';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  theme?: string;
  toggleTheme?: () => void;
}

const menuItems = [
  { id: 'checklist',      label: 'Vazifalar',    icon: ICONS.Dashboard,    roles: [UserRole.ADMIN] },
  { id: 'admin_kpi',      label: 'KPI Kiritish', icon: ICONS.KPI,          roles: [UserRole.ADMIN] },
  { id: 'kpi_reports',    label: 'Hisobotlar',   icon: ICONS.Star,         roles: [UserRole.ADMIN] },
  { id: 'master_data',    label: 'Master Baza',  icon: ICONS.Users,        roles: [UserRole.ADMIN] },
  { id: 'payouts',        label: 'Kassa',        icon: ICONS.CASHIER,      roles: [UserRole.CASHIER, UserRole.ADMIN] },
  { id: 'scripts',        label: 'Skriptlar',    icon: ICONS.CheckCircle,  roles: [UserRole.OPERATOR, UserRole.ADMIN] },
  { id: 'rating',         label: 'Reyting',      icon: ICONS.Star,         roles: [UserRole.OPERATOR, UserRole.ADMIN] },
  { id: 'users',          label: 'Xodimlar',     icon: ICONS.Users,        roles: [UserRole.ADMIN] },
  { id: 'kpi',            label: 'KPI',          icon: ICONS.KPI,          roles: [UserRole.OPERATOR] },
  { id: 'feedback',       label: 'Baholash',     icon: ICONS.Star,         roles: [UserRole.OPERATOR, UserRole.COURIER] },
  { id: 'courier_reports',label: 'Hisobot',      icon: ICONS.CheckCircle,  roles: [UserRole.COURIER] },
];

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  COURIER: 'Kuryer',
  CASHIER: 'Kassir',
};

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = menuItems.filter(item => item.roles.includes(user.role));

  const handleTab = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── DESKTOP HEADER ── */}
      <header className="hidden lg:flex items-center justify-between px-6 h-16 bg-white border-b border-border sticky top-0 z-50 shadow-soft">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-accent font-black text-base">
            D
          </div>
          <span className="font-bold text-primary text-base tracking-tight">Delever</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex justify-center px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {filtered.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-secondary hover:text-primary hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold text-primary leading-none">{user.fullName}</p>
            <p className="text-[10px] text-secondary mt-0.5">{roleLabel[user.role]}</p>
          </div>
          <button
            onClick={onLogout}
            title="Chiqish"
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 text-secondary flex items-center justify-center transition-colors"
          >
            <ICONS.Logout className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── MOBILE HEADER ── */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-border sticky top-0 z-50 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-accent font-black text-sm">D</div>
          <span className="font-bold text-primary text-sm">Delever</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" x2="20" y1="6"  y2="6"/>
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl animate-slideUp">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-accent font-black text-sm">D</div>
                <span className="font-bold text-primary">Delever</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filtered.map(item => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-secondary hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User info + logout */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-primary font-bold text-sm">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary leading-none">{user.fullName}</p>
                  <p className="text-[11px] text-secondary mt-0.5">{roleLabel[user.role]}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
