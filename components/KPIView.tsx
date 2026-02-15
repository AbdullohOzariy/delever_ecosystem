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
    if (score >= 4.8) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 4.0) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    if (score >= 3.0) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Mening Natijalarim</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            {new Date(month).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <input 
          type="month" 
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white transition-all text-slate-900 dark:text-white"
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Summary Cards (Mock Data for now) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">O'rtacha Ball</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">4.85</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Bonus</p>
          <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">+150k</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b-2 border-slate-900 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Sana</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Skript</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Xato</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Intizom</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Bonus</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Izoh</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {kpiData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-xs border-2 ${getScoreColor(item.scriptScore || 0)}`}>
                      {item.scriptScore || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">
                    {item.errorScore || '-'}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">
                    {item.disciplineScore || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {Number(item.bonusAmount) > 0 ? `+${Number(item.bonusAmount).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-500 max-w-xs truncate">
                    {item.comment || '-'}
                  </td>
                </tr>
              ))}
              {kpiData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 dark:text-slate-600 font-bold">
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
