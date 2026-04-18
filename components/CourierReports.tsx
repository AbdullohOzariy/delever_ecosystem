import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { api, API_URL } from '../api';

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

  const getWeekRangeDisplay = (weekStr: string) => {
    const monday = getDateFromWeek(weekStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString('uz-UZ')} - ${sunday.toLocaleDateString('uz-UZ')}`;
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let data;
      if (periodType === 'weekly') {
        const monday = getDateFromWeek(week);
        const dateStr = monday.toISOString().slice(0, 10);
        
        const res = await fetch(`${API_URL}/kpi/report/${user.id}?period=weekly&week=${dateStr}`);
        data = await res.json();
      } else {
        data = await api.getKPIReport(user.id, month);
      }
      setReport(data);
    } catch (error) {
      console.error("Hisobot yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-secondary">Yuklanmoqda...</div>;

  if (!report || !report.facts) {
    return (
      <div className="py-20 text-center bg-surface rounded-4xl border border-white/50 shadow-soft">
        <h2 className="text-3xl font-black text-primary">Hisobotlarim</h2>
        <p className="text-secondary mt-4">Ma'lumot topilmadi.</p>
      </div>
    );
  }

  const { facts } = report;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-4xl font-black text-primary tracking-tight uppercase">Yetkazib berish hisoboti</h2>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="bg-background p-1 rounded-2xl flex border border-secondary/10">
              <button 
                onClick={() => setPeriodType('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${periodType === 'monthly' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}
              >
                Oylik
              </button>
              <button 
                onClick={() => setPeriodType('weekly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${periodType === 'weekly' ? 'bg-surface shadow-sm text-primary' : 'text-secondary hover:text-primary'}`}
              >
                Haftalik
              </button>
            </div>
            {periodType === 'monthly' ? (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-background border-none rounded-2xl px-4 py-2 text-sm font-bold outline-none text-primary shadow-inner" />
            ) : (
              <div className="flex flex-col">
                <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className="bg-background border-none rounded-2xl px-4 py-2 text-sm font-bold outline-none text-primary shadow-inner" />
                <span className="text-[10px] text-secondary font-bold mt-1 text-center">{getWeekRangeDisplay(week)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-primary text-white px-8 py-6 rounded-3xl shadow-lg shadow-primary/20 text-center min-w-[200px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all"></div>
          <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Jami Daromad</p>
          <p className="text-3xl font-black tracking-tight">
            {facts.totalEarnings?.toLocaleString()} <span className="text-sm font-normal opacity-80">UZS</span>
          </p>
          {facts.isConfirmed && (
            <div className="mt-2 bg-emerald-500/20 py-1 px-3 rounded-lg inline-block text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30 text-emerald-300">
              Tasdiqlangan
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buyurtmalar */}
        <div className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 text-center group hover:shadow-hover transition-all duration-300">
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">Buyurtmalar</p>
          <h4 className="text-4xl font-black text-primary">{facts.totalOrders}</h4>
          <div className="mt-6 space-y-2 bg-background p-4 rounded-2xl border border-secondary/5">
            {Object.entries(facts.priceStats || {}).map(([price, count]) => (
              <div key={price} className="flex justify-between text-xs text-secondary font-medium px-2">
                <span>{Number(price).toLocaleString()} so'm:</span>
                <span className="font-bold text-primary">{String(count)} ta</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tezlik */}
        <div className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 text-center group hover:shadow-hover transition-all duration-300">
          <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">O'rtacha vaqt</p>
          <h4 className="text-4xl font-black text-primary">{facts.avgSpeedMinutes} <span className="text-lg text-secondary">min</span></h4>
          <div className="mt-6 bg-emerald-50 text-emerald-600 py-3 px-6 rounded-2xl inline-block border border-emerald-100">
            <p className="text-xs font-bold uppercase tracking-wide">Tezlik Bonusi</p>
            <p className="text-2xl font-black mt-1">+{facts.speedBonusCount}</p>
          </div>
        </div>

        {/* Bonuslar */}
        <div className="bg-accent p-8 rounded-4xl text-primary shadow-lg shadow-accent/20 text-center relative overflow-hidden border border-accentHover">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/20 rounded-full blur-3xl"></div>
          <p className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-2">Qo'shimcha Bonuslar</p>
          
          <div className="space-y-4 mt-6 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
            <div className="flex justify-between items-center border-b border-primary/10 pb-2">
              <span className="text-xs font-bold opacity-80">Tezlik uchun:</span>
              <span className="font-black">+{(facts.speedBonusCount * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-b border-primary/10 pb-2">
              <span className="text-xs font-bold opacity-80">Maxsus (8k/10k):</span>
              <span className="font-black">+{(facts.specialBonusCount * 1000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold opacity-80">Admin bonusi:</span>
              <span className="font-black">
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
