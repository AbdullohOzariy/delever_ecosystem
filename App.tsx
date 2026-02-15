import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import KPIView from './components/KPIView';
import FeedbackSystem from './components/FeedbackSystem';
import AdminPortal from './components/AdminPortal';
import CashierPortal from './components/CashierPortal';
import ScriptsPortal from './components/ScriptsPortal';
import AdminKPIEntry from './components/AdminKPIEntry';
import AdminKPIReports from './components/AdminKPIReports';
import RatingView from './components/RatingView';
import CourierReports from './components/CourierReports';
import MasterDataView from './components/MasterDataView';
import AdminChecklist from './components/AdminChecklist'; 
import { api } from './api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('checklist'); 
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (window.Telegram?.WebApp?.initData) {
      setIsTelegram(true);
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
      if (tgUser) {
        setTelegramId(tgUser.id);
        try {
          const response = await api.telegramLogin({ telegramId: tgUser.id });
          handleAuthSuccess(response);
          return; 
        } catch (error) {
          console.log("Telegram user not linked yet");
        }
      }
    }

    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('delever_user');

    if (token && savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      if (user.role === UserRole.ADMIN) loadUsers();
    }
    setAuthLoading(false);
  };

  const handleAuthSuccess = (response: any) => {
    const { token, user } = response;
    localStorage.setItem('token', token);
    localStorage.setItem('delever_user', JSON.stringify(user));
    setCurrentUser(user);
    
    if (user.role === UserRole.ADMIN) {
      setActiveTab('checklist'); 
      loadUsers();
    } else if (user.role === UserRole.CASHIER) {
      setActiveTab('payouts');
    } else if (user.role === UserRole.COURIER) {
      setActiveTab('courier_reports');
    } else {
      setActiveTab('kpi');
    }
    setAuthLoading(false);
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    
    try {
      const loginData = telegramId 
        ? { username, password, telegramId } 
        : { username, password };

      const response = telegramId 
        ? await api.telegramLogin(loginData as any) 
        : await api.login(loginData);
      
      handleAuthSuccess(response);
    } catch (error) {
      alert("Login yoki parol noto'g'ri!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('delever_user');
    localStorage.removeItem('token');
  };

  const handleAddUser = async (newUser: User) => {
    try {
      await api.register(newUser);
      loadUsers();
      alert("Foydalanuvchi yaratildi!");
    } catch (error) {
      alert("Xatolik yuz berdi");
    }
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] p-4 relative overflow-hidden">
        {/* Retro Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 overflow-hidden p-10 relative z-10">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-900 rounded-xl mx-auto flex items-center justify-center text-white font-black text-3xl mb-6 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
              D
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Xush kelibsiz</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Delever Ekotizimi</p>
            {isTelegram && <p className="text-emerald-600 text-xs font-black mt-4 bg-emerald-100 py-1 px-3 rounded-lg inline-block border-2 border-emerald-600 uppercase tracking-widest">Telegram orqali</p>}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Login</label>
              <input 
                name="username" 
                type="text" 
                required 
                className="w-full px-5 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all font-bold" 
                placeholder="admin" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Parol</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full px-5 py-4 rounded-xl bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-slate-900 focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all font-bold" 
                placeholder="••••••••" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl transition-all border-2 border-slate-900 hover:bg-white hover:text-slate-900 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-4"
            >
              {isTelegram ? 'Bog\'lash va Kirish' : 'Tizimga Kirish'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isTelegram && currentUser.role === UserRole.COURIER) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4">
        <CourierReports user={currentUser} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'checklist' && <AdminChecklist setActiveTab={setActiveTab} />}

          {activeTab === 'kpi' && <KPIView user={currentUser} />}
          {activeTab === 'courier_reports' && <CourierReports user={currentUser} />}
          
          {activeTab === 'admin_kpi' && (
            <AdminKPIEntry 
              users={users} 
              onAddUser={handleAddUser}
            />
          )}
          {activeTab === 'kpi_reports' && (
            <AdminKPIReports users={users} />
          )}

          {activeTab === 'master_data' && <MasterDataView />}
          {activeTab === 'rating' && <RatingView />}
          {activeTab === 'feedback' && <FeedbackSystem user={currentUser} />}
          {activeTab === 'users' && (
            <AdminPortal 
              users={users} 
              onAddUser={handleAddUser} 
              onUpdateUsers={handleUpdateUsers}
            />
          )}
          {activeTab === 'payouts' && <CashierPortal />}
          {activeTab === 'scripts' && <ScriptsPortal user={currentUser} />}
        </div>
      </main>
    </div>
  );
};

export default App;
