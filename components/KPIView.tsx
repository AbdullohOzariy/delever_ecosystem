import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface KPIViewProps {
  user: User;
}

const KPIView: React.FC<KPIViewProps> = ({ user }) => {
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadKPI();
  }, [month]);

  const loadKPI = async () => {
    setLoading(true);
    try {
      const data = await api.getKPIHistory(user.id, month);
      setKpiData(data);
    } catch (error) {
      console.error("KPI yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.8) return 'text-primary bg-accent border-accent'; // A'lo
    if (score >= 4.0) return 'text-primary bg-info border-info'; // Yaxshi
    if (score >= 3.0) return 'text-primary bg-warning border-warning'; // O'rta
    return 'text-primary bg-error border-error'; // Yomon
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface p-6 rounded-3xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">Mening Natijalarim</h2>
          <p className="text-secondary font-medium text-xs mt-1 uppercase tracking-widest">
            {new Date(month).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="month" 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-background border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all shadow-inner cursor-pointer"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 hover:shadow-hover transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">O'rtacha Ball</p>
            <div className="p-2 bg-accent/20 rounded-xl text-primary group-hover:bg-accent transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            </div>
          </div>
          <p className="text-5xl font-black text-primary tracking-tighter">4.85</p>
          <p className="text-xs text-accent font-bold mt-2 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
            +0.2 o'tgan oyga nisbatan
          </p>
        </div>

        <div className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 hover:shadow-hover transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest">Bonus</p>
            <div className="p-2 bg-bonus/20 rounded-xl text-primary group-hover:bg-bonus transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <p className="text-5xl font-black text-primary tracking-tighter">+150k</p>
          <p className="text-xs text-secondary font-medium mt-2">So'nggi yangilanish: Bugun</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-background text-secondary">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">Sana</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Skript</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Xato</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Intizom</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Bonus</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-r-2xl">Izoh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background">
              {kpiData.map((item) => (
                <tr key={item.id} className="hover:bg-background/50 transition-colors group">
                  <td className="px-6 py-5 font-bold text-primary text-sm">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-xl font-black text-xs border ${getScoreColor(item.scriptScore || 0)}`}>
                      {item.scriptScore || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">
                    {item.errorScore || '-'}
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">
                    {item.disciplineScore || '-'}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-bonus">
                    {Number(item.bonusAmount) > 0 ? `+${Number(item.bonusAmount).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-5 text-xs font-medium text-secondary max-w-xs truncate">
                    {item.comment || '-'}
                  </td>
                </tr>
              ))}
              {kpiData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-secondary font-bold">
                    Ma'lumot topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KPIView;
