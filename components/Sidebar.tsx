import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../types';
import { ICONS } from '../constants.tsx';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout, theme, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'checklist', label: 'Vazifalar', icon: ICONS.Dashboard, roles: [UserRole.ADMIN] },
    { id: 'kpi', label: 'Mening KPI', icon: ICONS.KPI, roles: [UserRole.OPERATOR] },
    { id: 'courier_reports', label: 'Hisobotlarim', icon: ICONS.CheckCircle, roles: [UserRole.COURIER] },
    { id: 'admin_kpi', label: 'KPI Boshqaruvi', icon: ICONS.KPI, roles: [UserRole.ADMIN] },
    { id: 'kpi_reports', label: 'KPI Hisoboti', icon: ICONS.Star, roles: [UserRole.ADMIN] },
    { id: 'master_data', label: 'Master Baza', icon: ICONS.Users, roles: [UserRole.ADMIN] },
    { id: 'payouts', label: 'To\'lovlar', icon: ICONS.CASHIER, roles: [UserRole.CASHIER, UserRole.ADMIN] },
    { id: 'scripts', label: 'Skriptlar', icon: ICONS.CheckCircle, roles: [UserRole.OPERATOR, UserRole.ADMIN] },
    { id: 'rating', label: 'Reyting', icon: ICONS.Star, roles: [UserRole.OPERATOR, UserRole.ADMIN] },
    { id: 'feedback', label: 'Baholash', icon: ICONS.Star, roles: [UserRole.OPERATOR, UserRole.COURIER] },
    { id: 'users', label: 'Xodimlar', icon: ICONS.Users, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-surface/80 backdrop-blur-md text-primary p-4 flex items-center justify-between sticky top-0 z-50 border-b border-secondary/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-2xl flex items-center justify-center text-primary font-black text-lg shadow-soft">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary font-display">Delever</h1>
            <p className="text-[10px] text-secondary font-medium">{formatDate(currentTime)}</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 bg-background rounded-2xl hover:bg-secondary/10 transition-colors">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-primary/5 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-[280px] bg-surface z-50 transform transition-transform duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) lg:translate-x-0 lg:static flex flex-col text-primary shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-soft lg:shadow-none lg:border-r border-secondary/5`}>
        
        {/* Logo Area */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-primary font-black text-2xl shadow-lg shadow-accent/20">
              D
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight font-display">Delever</h1>
              <p className="text-[10px] text-secondary font-medium tracking-widest uppercase">Ecosystem</p>
            </div>
          </div>

          {/* Time Widget */}
          <div className="bg-background p-5 rounded-3xl relative overflow-hidden group border border-secondary/5">
            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">{formatDate(currentTime)}</p>
            <p className="text-3xl font-bold text-primary tracking-tight font-display">{formatTime(currentTime)}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide py-2">
          {filteredItems.map(item => (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                activeTab === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/10' 
                  : 'hover:bg-background text-secondary hover:text-primary'
              }`}
            >
              <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                <item.icon />
              </div>
              <span className="font-semibold text-sm tracking-wide">{item.label}</span>
              
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="bg-background rounded-3xl p-4 border border-secondary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-secondary/10 flex items-center justify-center text-primary font-bold text-lg shadow-sm">
                {user.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-primary truncate font-display">{user.fullName}</p>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white hover:bg-rose-50 text-rose-500 rounded-2xl transition-all border border-secondary/5 font-bold text-xs uppercase tracking-widest group shadow-sm hover:shadow-md"
            >
              <ICONS.Logout />
              <span className="group-hover:translate-x-1 transition-transform">Chiqish</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
