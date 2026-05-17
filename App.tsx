import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Sidebar from './components/Sidebar'; // Bu endi Header vazifasini bajaradi
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
  const [activeTab, setActiveTab] = useState<string>(''); 
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); 
  
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // Tab o'zgarganda saqlash
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

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
      try {
        const user = JSON.parse(savedUser);
        if (user && user.id && user.role) {
          setCurrentUser(user);
          const savedTab = localStorage.getItem('activeTab');
          if (savedTab) {
            setActiveTab(savedTab);
          } else {
            setInitialTab(user);
          }
          if (user.role === UserRole.ADMIN) loadUsers();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('delever_user');
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('delever_user');
      }
    }
    setAuthLoading(false);
  };

  const setInitialTab = (user: User) => {
    let tab = 'kpi';
    if (user.role === UserRole.ADMIN) {
      tab = 'checklist';
    } else if (user.role === UserRole.CASHIER) {
      tab = 'payouts';
    } else if (user.role === UserRole.COURIER) {
      tab = 'courier_reports';
    }
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  const handleAuthSuccess = (response: any) => {
    const { token, user } = response;
    localStorage.setItem('token', token);
    localStorage.setItem('delever_user', JSON.stringify(user));
    setCurrentUser(user);
    
    // Login qilganda default tabga o'tish (yoki saqlanganiga)
    setInitialTab(user);
    
    if (user.role === UserRole.ADMIN) {
      loadUsers();
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
    localStorage.removeItem('activeTab'); // Logoutda tabni tozalash
    setActiveTab('');
  };


  const handleUpdateUsers = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[150px]"></div>
        
        <div className="w-full max-w-sm bg-surface rounded-4xl shadow-soft p-10 relative z-10 border border-white/50">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-accent rounded-2xl mx-auto flex items-center justify-center text-primary font-black text-3xl mb-6 shadow-lg shadow-accent/30">
              D
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tight mb-2">Xush kelibsiz</h1>
            <p className="text-secondary font-medium text-sm">Delever Ekotizimi</p>
            {isTelegram && <p className="text-accent font-bold text-xs mt-4 bg-accent/10 py-1 px-3 rounded-full inline-block">Telegram orqali</p>}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest ml-1">Login</label>
              <input 
                name="username" 
                type="text" 
                required 
                className="w-full px-5 py-4 rounded-2xl bg-background border-none text-primary placeholder-secondary/50 outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium" 
                placeholder="admin" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-widest ml-1">Parol</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full px-5 py-4 rounded-2xl bg-background border-none text-primary placeholder-secondary/50 outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium" 
                placeholder="••••••••" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 bg-accent hover:bg-accentHover text-primary font-bold rounded-2xl transition-all shadow-lg shadow-accent/20 active:scale-[0.98] mt-4"
            >
              {isTelegram ? 'Bog\'lash va Kirish' : 'Kirish'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isTelegram && currentUser.role === UserRole.COURIER) {
    return (
      <div className="min-h-screen bg-background p-4">
        <CourierReports user={currentUser} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary font-sans flex flex-col">
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} // <--- O'zgartirildi
        onLogout={handleLogout} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 p-6 lg:p-10 w-full max-w-[1920px] mx-auto">
        {activeTab === 'checklist' && <AdminChecklist setActiveTab={handleTabChange} />}

        {activeTab === 'kpi' && <KPIView user={currentUser} />}
        {activeTab === 'courier_reports' && <CourierReports user={currentUser} />}
        
        {activeTab === 'admin_kpi' && (
          <AdminKPIEntry
            users={users}
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
            onUpdateUsers={handleUpdateUsers}
          />
        )}
        {activeTab === 'payouts' && <CashierPortal />}
        {activeTab === 'scripts' && <ScriptsPortal user={currentUser} />}
      </main>
    </div>
  );
};

export default App;
