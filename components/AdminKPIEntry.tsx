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

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase">KPI Kiritish</h2>
          <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
            Operatorlar uchun kunlik natijalar
          </p>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all shadow-inner"
        />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {operators.map(operator => (
          <div key={operator.id} className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50 group hover:shadow-hover transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xl border border-blue-200">
                {operator.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-primary">{operator.fullName}</h3>
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Operator</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Skript</label>
                <input 
                  type="number" 
                  placeholder="0-5" 
                  className="w-full bg-background border-none rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'scriptScore', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Xato</label>
                <input 
                  type="number" 
                  placeholder="Soni" 
                  className="w-full bg-background border-none rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'errorScore', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Intizom</label>
                <input 
                  type="number" 
                  placeholder="Soni" 
                  className="w-full bg-background border-none rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all text-center"
                  onChange={(e) => handleInputChange(operator.id, 'disciplineScore', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1 mb-6">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Izoh</label>
              <textarea 
                className="w-full bg-background border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-accent/50 text-primary resize-none h-20 transition-all"
                placeholder="Izoh qoldiring..."
                onChange={(e) => handleInputChange(operator.id, 'comment', e.target.value)}
              />
            </div>

            <button 
              onClick={() => handleSave(operator.id)}
              className="w-full py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95"
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
