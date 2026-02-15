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
      <div className="lg:hidden bg-white/80 backdrop-blur-md text-slate-900 p-4 flex items-center justify-between sticky top-0 z-50 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/30">
            D
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Delever</h1>
            <p className="text-[10px] text-slate-500 font-medium">{formatDate(currentTime)}</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-[280px] bg-[#0F172A] z-50 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0 lg:static flex flex-col text-slate-300 shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl lg:shadow-none`}>
        
        {/* Logo Area */}
        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
              D
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Delever</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Ecosystem</p>
            </div>
          </div>

          {/* Time Widget */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all"></div>
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">{formatDate(currentTime)}</p>
            <p className="text-3xl font-black text-white tracking-tight">{formatTime(currentTime)}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-hide py-2">
          {filteredItems.map(item => (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              {activeTab === item.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
              <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                <item.icon />
              </div>
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
              
              {activeTab === item.id && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="bg-slate-800/30 rounded-[20px] p-4 border border-slate-700/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                {user.fullName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user.fullName}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl transition-all border border-rose-500/10 font-bold text-xs uppercase tracking-widest group"
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
