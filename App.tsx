import React, { useState, useEffect, Suspense, lazy } from 'react';
import { User, UserRole } from './types';
import Sidebar from './components/Sidebar'; // Bu endi Header vazifasini bajaradi
import { api } from './api';

// Og'ir bo'limlarni faqat ochilganda yuklash (kichikroq boshlang'ich bundle).
// xlsx / jspdf / recharts kabi kutubxonalar shu bo'limlar bilan birga keyin yuklanadi.
const KPIView = lazy(() => import('./components/KPIView'));
const FeedbackSystem = lazy(() => import('./components/FeedbackSystem'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));
const CashierPortal = lazy(() => import('./components/CashierPortal'));
const ScriptsPortal = lazy(() => import('./components/ScriptsPortal'));
const AdminKPIEntry = lazy(() => import('./components/AdminKPIEntry'));
const AdminKPIReports = lazy(() => import('./components/AdminKPIReports'));
const RatingView = lazy(() => import('./components/RatingView'));
const CourierReports = lazy(() => import('./components/CourierReports'));
const MasterDataView = lazy(() => import('./components/MasterDataView'));
const AdminChecklist = lazy(() => import('./components/AdminChecklist'));

// Lazy bo'lim yuklanayotganda ko'rsatiladigan spinner
const ViewLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

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
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-primary font-black text-2xl shadow-card animate-pulse">D</div>
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Left panel — branding */}
        <div className="hidden lg:flex w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #B4F481 0%, transparent 50%), radial-gradient(circle at 80% 20%, #B4F481 0%, transparent 50%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-primary font-black text-xl">D</div>
              <span className="text-white font-bold text-lg tracking-tight">Delever</span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Ekotizim<br />boshqaruvi
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Operatorlar, kuryerlar va kassa — barchasi bir joyda.
            </p>
          </div>
          <p className="relative z-10 text-white/25 text-xs">© 2026 Delever</p>
        </div>

        {/* Right panel — login form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm animate-scaleIn">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden">
              <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-primary font-black text-lg">D</div>
              <span className="font-bold text-primary text-lg">Delever</span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-black text-primary mb-1">Kirish</h1>
              <p className="text-secondary text-sm">
                {isTelegram ? 'Telegram orqali ulanish' : 'Hisobingizga kiring'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary">Login</label>
                <input
                  name="username"
                  type="text"
                  required
                  className="input"
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary">Parol</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-3 bg-primary text-white font-bold rounded-xl text-sm transition-all hover:bg-primary/90 active:scale-[0.98] shadow-sm"
              >
                {isTelegram ? "Bog'lash va Kirish" : 'Kirish →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isTelegram && currentUser.role === UserRole.COURIER) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Suspense fallback={<ViewLoader />}>
          <CourierReports user={currentUser} />
        </Suspense>
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
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 w-full max-w-screen-2xl mx-auto">
        <Suspense fallback={<ViewLoader />}>
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
        </Suspense>
      </main>
    </div>
  );
};

export default App;
