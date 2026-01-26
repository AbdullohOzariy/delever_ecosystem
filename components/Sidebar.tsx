import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { ICONS } from '../constants.tsx'; // YANGI

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <h1 className="text-xl font-black tracking-tighter text-blue-500">DELEVER</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-slate-800 rounded-xl">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      <div className={`fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col text-slate-300 shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800/50 hidden lg:block">
          <h1 className="text-3xl font-black text-blue-500 tracking-tighter">DELEVER</h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-2">Ecosystem</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={`${item.id}-${item.label}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 font-bold scale-105' 
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center space-x-4 mb-6 px-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-xl shadow-inner">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-2xl transition-all border border-rose-500/20 font-black text-xs uppercase tracking-widest"
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
