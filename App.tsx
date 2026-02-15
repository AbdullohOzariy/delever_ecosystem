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
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Theme State
  
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Load Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900 transition-colors duration-300">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 dark:border-white border-t-transparent"></div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8] dark:bg-slate-950 p-4 relative overflow-hidden transition-colors duration-300">
        {/* Retro Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px', color: theme === 'dark' ? '#fff' : '#000' }}>
        </div>

        {/* Theme Toggle (Login Page) */}
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-400 text-slate-900 dark:text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all z-50"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          )}
        </button>

        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-lg shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.1)] border-2 border-slate-900 dark:border-slate-400 overflow-hidden p-8 relative z-10 transition-all duration-300">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-slate-900 dark:bg-white rounded-lg mx-auto flex items-center justify-center text-white dark:text-slate-900 font-black text-2xl mb-4 border-2 border-slate-900 dark:border-slate-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
              D
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase mb-1">Xush kelibsiz</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Delever Ekotizimi</p>
            {isTelegram && <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black mt-3 bg-emerald-100 dark:bg-emerald-900/30 py-1 px-2 rounded border-2 border-emerald-600 dark:border-emerald-500 uppercase tracking-widest">Telegram orqali</p>}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest ml-1">Login</label>
              <input 
                name="username" 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-slate-900 dark:focus:border-white focus:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] transition-all font-bold text-sm" 
                placeholder="admin" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest ml-1">Parol</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-slate-900 dark:focus:border-white focus:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:focus:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] transition-all font-bold text-sm" 
                placeholder="••••••••" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest rounded-lg transition-all border-2 border-slate-900 dark:border-white hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-4 text-xs"
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
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 transition-colors duration-300">
        <CourierReports user={currentUser} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        theme={theme}
        toggleTheme={toggleTheme}
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
