import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { ICONS } from '../constants.tsx';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'checklist', label: 'Vazifalar', icon: ICONS.Dashboard, roles: [UserRole.ADMIN] },
    { id: 'kpi', label: 'KPI', icon: ICONS.KPI, roles: [UserRole.OPERATOR] },
    { id: 'courier_reports', label: 'Hisobot', icon: ICONS.CheckCircle, roles: [UserRole.COURIER] },
    { id: 'admin_kpi', label: 'Boshqaruv', icon: ICONS.KPI, roles: [UserRole.ADMIN] },
    { id: 'kpi_reports', label: 'Hisobotlar', icon: ICONS.Star, roles: [UserRole.ADMIN] },
    { id: 'master_data', label: 'Master Baza', icon: ICONS.Users, roles: [UserRole.ADMIN] },
    { id: 'payouts', label: 'Kassa', icon: ICONS.CASHIER, roles: [UserRole.CASHIER, UserRole.ADMIN] },
    { id: 'scripts', label: 'Skriptlar', icon: ICONS.CheckCircle, roles: [UserRole.OPERATOR, UserRole.ADMIN] },
    { id: 'rating', label: 'Reyting', icon: ICONS.Star, roles: [UserRole.OPERATOR, UserRole.ADMIN] },
    { id: 'feedback', label: 'Baholash', icon: ICONS.Star, roles: [UserRole.OPERATOR, UserRole.COURIER] },
    { id: 'users', label: 'Xodimlar', icon: ICONS.Users, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
  };

  return (
    <>
      {/* DESKTOP HEADER (Refined & Responsive) */}
      <header className="hidden lg:flex items-center justify-between px-6 xl:px-8 h-20 bg-surface shadow-soft sticky top-0 z-50 w-full border-b border-secondary/5">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-4 w-auto xl:w-64 shrink-0">
          <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center text-primary font-black text-xl shadow-sm">
            D
          </div>
          <div className="hidden xl:block">
            <h1 className="text-lg font-bold text-primary tracking-tight font-display leading-none">Delever</h1>
            <p className="text-[10px] text-secondary font-medium tracking-widest uppercase mt-0.5">Ecosystem</p>
          </div>
        </div>

        {/* Center: Navigation (Scrollable) */}
        <nav className="flex-1 flex justify-center overflow-hidden mx-4">
          <div className="flex items-center gap-1 bg-background p-1.5 rounded-3xl border border-secondary/5 overflow-x-auto scrollbar-hide max-w-full">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`px-4 xl:px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all duration-300 flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === item.id 
                    ? 'bg-surface text-primary shadow-soft scale-105' 
                    : 'text-secondary hover:text-primary hover:bg-surface/50'
                }`}
              >
                <item.icon 
                  className={`w-4 h-4 transition-colors ${activeTab === item.id ? 'text-accent' : 'text-secondary group-hover:text-primary'}`} 
                  strokeWidth={2} 
                />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden">{item.label.slice(0, 3)}</span> {/* Kichik ekranda qisqartirish */}
                {activeTab === item.id && (
                  <div className="w-1.5 h-1.5 bg-accent rounded-full ml-1 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Right: User & Time */}
        <div className="flex items-center gap-4 xl:gap-6 w-auto xl:w-64 justify-end shrink-0">
          <p className="text-[10px] text-secondary font-bold uppercase tracking-widest hidden xl:block bg-background px-3 py-1.5 rounded-lg border border-secondary/5">
            {formatDate(currentTime)}
          </p>
          
          <div className="flex items-center gap-3 pl-4 xl:pl-6 border-l border-secondary/10">
            <div className="text-right hidden xl:block">
              <p className="text-xs font-bold text-primary">{user.fullName}</p>
              <p className="text-[9px] text-secondary font-bold uppercase tracking-widest">{user.role}</p>
            </div>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm"
              title="Chiqish"
            >
              <ICONS.Logout className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <div className="lg:hidden bg-surface p-4 flex items-center justify-between sticky top-0 z-50 shadow-soft border-b border-secondary/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-primary font-black text-lg shadow-sm">
            D
          </div>
          <h1 className="text-lg font-bold text-primary font-display">Delever</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 bg-background rounded-xl text-primary border border-secondary/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-primary/20 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MOBILE MENU DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-72 bg-surface z-50 transform transition-transform duration-300 lg:hidden flex flex-col shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-secondary/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">Menu</h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-background rounded-xl text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-accent text-primary font-bold shadow-lg shadow-accent/20' 
                  : 'bg-background text-secondary hover:bg-surface'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-secondary/10 bg-background/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary font-bold text-lg shadow-sm">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-primary">{user.fullName}</p>
              <p className="text-[10px] text-secondary font-bold uppercase">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-rose-50 text-rose-500 rounded-xl font-bold text-xs uppercase tracking-widest border border-rose-100">
            Chiqish
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
