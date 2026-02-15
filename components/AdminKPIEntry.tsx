import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface AdminKPIEntryProps {
  users: User[];
  onAddUser: (user: User) => void;
}

const AdminKPIEntry: React.FC<AdminKPIEntryProps> = ({ users }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const operators = users.filter(u => u.role === UserRole.OPERATOR);

  const handleInputChange = (userId: string, field: string, value: string) => {
    setKpiData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const handleSave = async (userId: string) => {
    const data = kpiData[userId];
    if (!data) return;

    try {
      await api.saveDailyKPI({
        userId,
        date: selectedDate,
        ...data
      });
      setToast({ message: "KPI saqlandi", type: 'success' });
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">KPI Kiritish</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Operatorlar uchun kunlik natijalar
          </p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {operators.map(operator => (
          <div key={operator.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] group hover:translate-y-[-2px] transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xl border-2 border-blue-500">
                {operator.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{operator.fullName}</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Operator</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Skript</label>
                <input 
                  type="number" 
                  placeholder="0-5" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'scriptScore', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Xato</label>
                <input 
                  type="number" 
                  placeholder="Soni" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'errorScore', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Intizom</label>
                <input 
                  type="number" 
                  placeholder="Soni" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'disciplineScore', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Izoh</label>
              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white resize-none h-20 transition-all"
                placeholder="Izoh qoldiring..."
                onChange={(e) => handleInputChange(operator.id, 'comment', e.target.value)}
              />
            </div>

            <button 
              onClick={() => handleSave(operator.id)}
              className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 dark:border-white"
            >
              Saqlash
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminKPIEntry;
