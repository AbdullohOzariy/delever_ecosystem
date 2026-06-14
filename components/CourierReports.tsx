import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { api, API_URL, authFetch } from '../api';
import { weekStartOf, shiftWeek, weekRangeLabel, weekStartFromDateStr } from './weekUtils';

interface CourierReportsProps {
  user: User;
}

const CourierReports: React.FC<CourierReportsProps> = ({ user }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [periodType, setPeriodType] = useState<'monthly' | 'weekly'>('weekly'); // Default: Weekly
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
  // Hafta kaliti = shu haftaning Yakshanba sanasi (YYYY-MM-DD). Hafta: Yakshanba–Shanba.
  const [week, setWeek] = useState(weekStartOf());

  useEffect(() => {
    loadReport();
  }, [user.id, month, week, periodType]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let data;
      if (periodType === 'weekly') {
        const res = await authFetch(`${API_URL}/kpi/report/${user.id}?period=weekly&week=${week}`);
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
              <div className="flex items-center gap-1.5">
                <button onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Oldingi hafta"
                  className="p-2 rounded-xl bg-background text-secondary hover:text-primary hover:bg-white transition-all shadow-inner active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                {/* Kalendar: istalgan kun tanlansa ham o'sha haftaning Yakshanbasiga tushadi */}
                <label className="relative flex flex-col items-center bg-background rounded-2xl px-4 py-1.5 shadow-inner min-w-[200px] cursor-pointer hover:bg-white transition-all"
                  title="Kalendardan tanlang — hafta Yakshanbadan boshlanadi">
                  <span className="text-sm font-black text-primary tracking-tight">{weekRangeLabel(week)}</span>
                  <span className="text-[9px] text-secondary font-bold uppercase tracking-widest">Yakshanba — Shanba</span>
                  <input type="date" value={week}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    onChange={(e) => e.target.value && setWeek(weekStartFromDateStr(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Kalendardan tanlash" />
                </label>
                <button onClick={() => setWeek(shiftWeek(week, 1))} aria-label="Keyingi hafta"
                  className="p-2 rounded-xl bg-background text-secondary hover:text-primary hover:bg-white transition-all shadow-inner active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </button>
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
