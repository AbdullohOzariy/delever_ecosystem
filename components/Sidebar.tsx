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
      <div className="lg:hidden bg-white text-slate-900 p-4 flex items-center justify-between sticky top-0 z-50 border-b-2 border-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-lg border-2 border-slate-900">
            D
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">Delever</h1>
            <p className="text-[10px] text-slate-500 font-bold">{formatDate(currentTime)}</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-slate-100 rounded-lg border-2 border-slate-900 hover:bg-slate-200 transition-colors">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-[260px] bg-white z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col text-slate-900 shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} border-r-2 border-slate-900`}>
        
        {/* Logo Area */}
        <div className="p-6 border-b-2 border-slate-900 bg-slate-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
              D
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Delever</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Ecosystem</p>
            </div>
          </div>

          {/* Time Widget */}
          <div className="bg-white p-3 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{formatDate(currentTime)}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">{formatTime(currentTime)}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide py-6">
          {filteredItems.map(item => (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2 font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] translate-x-[-2px] translate-y-[-2px]' 
                  : 'bg-white text-slate-600 border-transparent hover:border-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon />
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t-2 border-slate-900 bg-slate-50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-lg bg-white border-2 border-slate-900 flex items-center justify-center text-slate-900 font-black text-lg">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-rose-50 text-rose-600 rounded-xl transition-all border-2 border-slate-200 hover:border-rose-600 font-black text-xs uppercase tracking-widest"
          >
            <ICONS.Logout />
            <span>Chiqish</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
