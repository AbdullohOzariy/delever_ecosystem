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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Yuklanmoqda...</div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-blue-600">DELEVER</h1>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-xs mt-2">Restoran Ekotizimi</p>
            {isTelegram && <p className="text-emerald-500 text-xs font-bold mt-4">Telegram orqali kirish</p>}
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Login</label>
              <input name="username" type="text" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-medium" placeholder="admin" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Parol</label>
              <input name="password" type="password" required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none font-medium" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-xl">
              {isTelegram ? 'Bog\'lash va Kirish' : 'Kirish'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isTelegram && currentUser.role === UserRole.COURIER) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <CourierReports user={currentUser} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
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
