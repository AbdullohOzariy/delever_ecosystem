import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface AdminKPIEntryProps {
  users: User[];
  onAddUser: (user: User) => void;
}

const AdminKPIEntry: React.FC<AdminKPIEntryProps> = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  // KPI Form States
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  
  // Qaysi userlar tahrirlash rejimida (blokdan chiqarilgan)
  const [editingUsers, setEditingUsers] = useState<Set<string>>(new Set());

  // History Modal
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      loadDailyKPIs();
    }
  }, [selectedDate, users]);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.filter((u: any) => u.role === UserRole.OPERATOR));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyKPIs = async () => {
    const newKpiData: Record<string, any> = {};
    const newEditingUsers = new Set<string>(); // Yangi sana tanlanganda hammasi bloklanadi (agar ma'lumot bo'lsa)

    await Promise.all(users.map(async (user) => {
      try {
        const history = await api.getKPIHistory(user.id);
        const todayKPI = history.find((h: any) => h.date.startsWith(selectedDate));
        
        if (todayKPI) {
          newKpiData[user.id] = {
            scriptScore: todayKPI.scriptScore,
            errorCount: todayKPI.errorScore,
            disciplineScore: todayKPI.disciplineScore,
            comment: todayKPI.comment,
            hasData: true // Ma'lumot borligini belgilash
          };
        } else {
          newKpiData[user.id] = {
            scriptScore: '',
            errorCount: '',
            disciplineScore: '',
            comment: '',
            hasData: false // Ma'lumot yo'q (yangi kiritish)
          };
          newEditingUsers.add(user.id); // Ma'lumot yo'q bo'lsa, tahrirlash ochiq bo'ladi
        }
      } catch (e) {
        console.error(e);
      }
    }));

    setKpiData(newKpiData);
    setEditingUsers(newEditingUsers);
  };

  const handleInputChange = (userId: string, field: string, value: any) => {
    setKpiData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const toggleEdit = (userId: string) => {
    const newEditing = new Set(editingUsers);
    if (newEditing.has(userId)) {
      newEditing.delete(userId); // Bloklash (bekor qilish)
      loadDailyKPIs(); // Eski qiymatni qaytarish
    } else {
      newEditing.add(userId); // Ochish
    }
    setEditingUsers(newEditing);
  };

  const saveKPI = async (userId: string) => {
    const data = kpiData[userId];
    if (!data) return;

    try {
      await api.saveDailyKPI({
        userId,
        date: selectedDate,
        scriptScore: Number(data.scriptScore) || 0,
        errorScore: Number(data.errorCount) || 0,
        disciplineScore: Number(data.disciplineScore) || 0,
        comment: data.comment || ''
      });
      setToast({ message: "Operator KPI saqlandi!", type: 'success' });
      
      // Saqlagandan keyin bloklash
      const newEditing = new Set(editingUsers);
      newEditing.delete(userId);
      setEditingUsers(newEditing);
      
      // Ma'lumot borligini belgilash (qayta yuklamasdan)
      setKpiData(prev => ({
        ...prev,
        [userId]: { ...prev[userId], hasData: true }
      }));

    } catch (e) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  const openHistory = async (user: any) => {
    setHistoryUser(user);
    setIsHistoryOpen(true);
    try {
      const data = await api.getKPIHistory(user.id);
      setHistoryData(data);
    } catch (error) {
      console.error("Tarixni yuklashda xatolik");
    }
  };

  if (loading) return <div className="p-10 text-center">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">KPI Boshqaruvi</h2>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
            Operatorlar uchun kunlik baholash
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase">Sanani tanlang:</span>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => {
          const userData = kpiData[user.id] || {};
          const isEditing = editingUsers.has(user.id);
          const isLocked = userData.hasData && !isEditing;

          return (
            <div key={user.id} className={`bg-white rounded-[2rem] p-6 border shadow-sm transition-all group ${isLocked ? 'border-slate-100 opacity-90' : 'border-blue-100 shadow-md'}`}>
              <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center">
                
                {/* User Info */}
                <div className="flex items-center gap-5 w-full xl:w-1/4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg bg-blue-500 shadow-blue-500/30">
                    {user.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">{user.fullName}</h4>
                    <div className="flex gap-3 mt-1">
                      <button 
                        onClick={() => openHistory(user)}
                        className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:underline"
                      >
                        Tarix
                      </button>
                      {userData.hasData && (
                        <button 
                          onClick={() => toggleEdit(user.id)}
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 flex items-center gap-1"
                        >
                          {isEditing ? 'Bekor qilish' : 'Tahrirlash'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* OPERATOR FORM */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 w-full">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Skript (0-5)</label>
                    <input 
                      type="number" 
                      max="5"
                      min="0"
                      step="0.1"
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-black outline-none transition-all ${
                        isLocked ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                      placeholder="5.0"
                      value={userData.scriptScore || ''}
                      onChange={(e) => handleInputChange(user.id, 'scriptScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Xatolar (Soni)</label>
                    <input 
                      type="number" 
                      min="0"
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-black outline-none transition-all ${
                        isLocked ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-rose-500'
                      }`}
                      placeholder="0"
                      value={userData.errorCount || ''}
                      onChange={(e) => handleInputChange(user.id, 'errorCount', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Intizom (Qoidabuzarlik)</label>
                    <input 
                      type="number" 
                      min="0"
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-black outline-none transition-all ${
                        isLocked ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'
                      }`}
                      placeholder="0"
                      value={userData.disciplineScore || ''}
                      onChange={(e) => handleInputChange(user.id, 'disciplineScore', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Izoh</label>
                    <input 
                      type="text" 
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all ${
                        isLocked ? 'bg-slate-50 border-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200 focus:border-blue-500'
                      }`}
                      placeholder="Qisqa izoh..."
                      value={userData.comment || ''}
                      onChange={(e) => handleInputChange(user.id, 'comment', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>

                {/* Action Button */}
                {!isLocked && (
                  <button 
                    onClick={() => saveKPI(user.id)}
                    className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 active:scale-95 bg-slate-900 hover:bg-blue-600 shadow-blue-500/20 animate-in zoom-in"
                  >
                    Saqlash
                  </button>
                )}
                
                {isLocked && (
                  <div className="px-8 py-4 flex flex-col items-center justify-center text-emerald-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest mt-1">Saqlandi</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* HISTORY MODAL */}
      {isHistoryOpen && historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{historyUser.fullName}</h3>
                <p className="text-slate-500 text-sm font-medium">Baholash tarixi</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Sana</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Skript</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Xato</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Intizom</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Izoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyData.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center font-black text-blue-600">{item.scriptScore}</td>
                    <td className="px-4 py-3 text-center font-black text-rose-500">{item.errorScore}</td>
                    <td className="px-4 py-3 text-center font-black text-amber-500">{item.disciplineScore}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 italic">{item.comment || '-'}</td>
                  </tr>
                ))}
                {historyData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-bold">Tarix topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKPIEntry;
