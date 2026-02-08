import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../api';

interface CourierReportsProps {
  user: User;
}

const CourierReports: React.FC<CourierReportsProps> = ({ user }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [periodType, setPeriodType] = useState<'monthly' | 'weekly'>('weekly'); // Default: Weekly
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
  // Hozirgi haftani aniqlash
  const getCurrentWeek = () => {
    const date = new Date();
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };

  const [week, setWeek] = useState(getCurrentWeek());

  useEffect(() => {
    loadReport();
  }, [user.id, month, week, periodType]);

  const getDateFromWeek = (weekStr: string) => {
    const [y, w] = weekStr.split('-W');
    const year = parseInt(y);
    const week = parseInt(w);
    
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    return ISOweekStart; 
  };

  // YANGI: Hafta oralig'ini hisoblash (Yakshanba - Shanba)
  const getWeekRangeDisplay = (weekStr: string) => {
    const monday = getDateFromWeek(weekStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() - 1); // Yakshanba (Hafta boshi)
    
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6); // Shanba (Hafta oxiri)

    return `${sunday.toLocaleDateString('uz-UZ')} - ${saturday.toLocaleDateString('uz-UZ')}`;
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let periodQuery = `month=${month}`;
      
      if (periodType === 'weekly') {
        const monday = getDateFromWeek(week);
        const dateStr = monday.toISOString().slice(0, 10);
        periodQuery = `period=weekly&week=${dateStr}`;
      }

      const res = await fetch(`http://localhost:3001/api/kpi/report/${user.id}?${periodQuery}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Hisobot yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400">Yuklanmoqda...</div>;

  if (!report || !report.facts) {
    return (
      <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
        <h2 className="text-3xl font-black text-slate-900">Hisobotlarim</h2>
        <p className="text-slate-500 mt-4">Ma'lumot topilmadi.</p>
      </div>
    );
  }

  const { facts } = report;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Yetkazib berish hisoboti</h2>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="bg-slate-100 p-1 rounded-xl flex">
              <button 
                onClick={() => setPeriodType('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${periodType === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
              >
                Oylik
              </button>
              <button 
                onClick={() => setPeriodType('weekly')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${periodType === 'weekly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
              >
                Haftalik
              </button>
            </div>
            {periodType === 'monthly' ? (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />
            ) : (
              <div className="flex flex-col">
                <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" />
                <span className="text-[10px] text-slate-400 font-bold mt-1 text-center">{getWeekRangeDisplay(week)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-600 text-white px-8 py-6 rounded-[2rem] shadow-xl shadow-blue-500/20 text-center min-w-[200px]">
          <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Jami Daromad</p>
          <p className="text-3xl font-black tracking-tight">
            {facts.totalEarnings?.toLocaleString()} <span className="text-sm font-normal opacity-80">UZS</span>
          </p>
          {facts.isConfirmed && (
            <div className="mt-2 bg-white/20 py-1 px-3 rounded-lg inline-block text-[10px] font-bold uppercase tracking-widest">
              Tasdiqlangan
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buyurtmalar */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group hover:border-blue-200 transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Buyurtmalar</p>
          <h4 className="text-4xl font-black text-slate-900">{facts.totalOrders}</h4>
          <div className="mt-4 space-y-1">
            {Object.entries(facts.priceStats || {}).map(([price, count]) => (
              <div key={price} className="flex justify-between text-xs text-slate-500 font-medium px-4">
                <span>{Number(price).toLocaleString()} so'm:</span>
                <span className="font-bold text-slate-700">{String(count)} ta</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tezlik */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group hover:border-blue-200 transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">O'rtacha vaqt</p>
          <h4 className="text-4xl font-black text-slate-900">{facts.avgSpeedMinutes} <span className="text-lg text-slate-400">min</span></h4>
          <div className="mt-4 bg-emerald-50 text-emerald-600 py-2 px-4 rounded-xl inline-block">
            <p className="text-xs font-bold">Tezlik Bonusi</p>
            <p className="text-lg font-black">+{facts.speedBonusCount}</p>
          </div>
        </div>

        {/* Bonuslar */}
        <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-lg text-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
          <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-2">Qo'shimcha Bonuslar</p>
          
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center border-b border-white/20 pb-2">
              <span className="text-xs font-medium opacity-80">Tezlik uchun:</span>
              <span className="font-bold">+{(facts.speedBonusCount * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/20 pb-2">
              <span className="text-xs font-medium opacity-80">Maxsus (8k/10k):</span>
              <span className="font-bold">+{(facts.specialBonusCount * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium opacity-80">Admin bonusi:</span>
              <span className="font-bold">
                {facts.manualBonus > 0 ? '+' : ''}{facts.manualBonus.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierReports;
