import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { api, API_URL, authFetch } from '../api';
import { weekStartOf, shiftWeek, weekRangeLabel, weekStartFromDateStr } from './weekUtils';
import Toast from './ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminKPIReportsProps {
  users: User[];
}

const AdminKPIReports: React.FC<AdminKPIReportsProps> = ({ users }) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Hafta kaliti = shu haftaning Yakshanba sanasi (YYYY-MM-DD). Hafta: Yakshanba–Shanba.
  const [week, setWeek] = useState(weekStartOf());
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.OPERATOR);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [editingUsers, setEditingUsers] = useState<Set<string>>(new Set());
  const [bonusValues, setBonusValues] = useState<Record<string, string>>({});

  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadAllReports();
  }, [month, week, activeRole]);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const targetUsers = users.filter(u => u.role === activeRole);

      const promises = targetUsers.map(async (user) => {
        try {
          let data;
          if (activeRole === UserRole.COURIER) {
            const res = await authFetch(`${API_URL}/kpi/report/${user.id}?period=weekly&week=${week}`);
            data = await res.json();
          } else {
            data = await api.getKPIReport(user.id, month);
          }
          
          return { user, ...data };
        } catch (e) {
          return { user, finalScore: 0, facts: {}, scores: {} };
        }
      });

      const results = await Promise.all(promises);
      
      if (activeRole === UserRole.OPERATOR) {
        setReports(results.sort((a, b) => Number(b.finalScore) - Number(a.finalScore)));
      } else {
        setReports(results.sort((a, b) => (b.facts?.totalEarnings || 0) - (a.facts?.totalEarnings || 0)));
      }
    } catch (error) {
      console.error("Hisobotlarni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAll = async () => {
    if (confirm(`Barcha ${activeRole === UserRole.COURIER ? 'kuryerlarni' : 'operatorlarni'} tasdiqlaysizmi?`)) {
      try {
        const response = await api.confirmAllKPI({ week, role: activeRole });
        setToast({ message: response.message, type: 'success' });
        
        loadAllReports(); 
      } catch (error) {
        setToast({ message: "Xatolik yuz berdi", type: 'error' });
      }
    }
  };

  const toggleEdit = (userId: string, currentBonus: number) => {
    const newEditing = new Set(editingUsers);
    if (newEditing.has(userId)) {
      saveBonus(userId);
      newEditing.delete(userId);
    } else {
      setBonusValues(prev => ({ ...prev, [userId]: String(currentBonus) }));
      newEditing.add(userId);
    }
    setEditingUsers(newEditing);
  };

  const handleBonusChange = (userId: string, value: string) => {
    setBonusValues(prev => ({ ...prev, [userId]: value }));
  };

  const saveBonus = async (userId: string) => {
    const amountStr = bonusValues[userId];
    if (amountStr === undefined) return;
    
    const newBonus = parseFloat(amountStr) || 0;

    try {
      // Bonus shu hafta oralig'iga tushishi uchun kalit (Yakshanba) sanasini ishlatamiz
      await api.saveDailyKPI({
        userId,
        date: week,
        bonusAmount: newBonus,
        comment: 'Haftalik bonus'
      });

      setReports(prev => prev.map(rep => {
        if (rep.user.id === userId) {
          const oldBonus = rep.facts.manualBonus || 0;
          const diff = newBonus - oldBonus;
          return {
            ...rep,
            facts: {
              ...rep.facts,
              manualBonus: newBonus,
              totalEarnings: rep.facts.totalEarnings + diff
            }
          };
        }
        return rep;
      }));

      setToast({ message: "Bonus saqlandi", type: 'success' });
    } catch (error) {
      setToast({ message: "Xatolik", type: 'error' });
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`KPI Hisoboti: ${activeRole === UserRole.OPERATOR ? 'Operatorlar' : 'Kuryerlar'}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    const periodText = activeRole === UserRole.OPERATOR ? `Oy: ${month}` : `Hafta (Yak–Shan): ${weekRangeLabel(week)}`;
    doc.text(periodText, 14, 30);

    const tableColumn = activeRole === UserRole.OPERATOR 
      ? ["Xodim", "Skript", "Sifat", "Intizom", "Buyurtma", "Tezlik", "Chek", "Yakuniy Ball"]
      : ["Xodim", "Buyurtma Soni", "Tafsilotlar", "O'rtacha Tezlik", "Maxsus Bonus", "Qo'shimcha", "Jami Daromad"];

    const tableRows = reports.map(rep => {
      if (activeRole === UserRole.OPERATOR) {
        return [
          rep.user.fullName,
          rep.scores?.script || '-',
          rep.scores?.errors || '-',
          rep.scores?.discipline || '-',
          rep.scores?.orders || '-',
          rep.scores?.speed || '-',
          rep.scores?.check || '-',
          Number(rep.finalScore).toFixed(2)
        ];
      } else {
        const details = Object.entries(rep.facts?.priceStats || {})
          .map(([price, count]) => `${Number(price).toLocaleString()}: ${count} ta`)
          .join('\n');

        return [
          rep.user.fullName,
          rep.facts?.totalOrders || 0,
          details || '-', 
          `${rep.facts?.avgSpeedMinutes || 0} min`,
          rep.facts?.specialBonusCount || 0,
          rep.facts?.manualBonus || 0,
          `${(rep.facts?.totalEarnings || 0).toLocaleString()} UZS`
        ];
      }
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74] } 
    });

    doc.save(`kpi_report_${activeRole}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const getStatusColor = (score: number) => {
    if (score >= 4.8) return 'bg-accent text-primary border-accent';
    if (score >= 4.5) return 'bg-accent/80 text-primary border-accent';
    if (score >= 4.0) return 'bg-info text-primary border-info';
    if (score >= 3.5) return 'bg-warning text-primary border-warning';
    return 'bg-error text-primary border-error';
  };

  const formatDisplayDate = () => {
    if (activeRole === UserRole.OPERATOR) {
      const [y, m] = month.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1);
      return date.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
    } else {
      return weekRangeLabel(week);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface p-6 rounded-3xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">KPI Umumiy Hisobot</h2>
          <p className="text-secondary font-medium mt-1 uppercase text-[10px] tracking-widest">
            {activeRole === UserRole.OPERATOR ? 'Oylik Sifat Nazorati' : 'Haftalik Yetkazib Berish Hisoboti'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-background p-1 rounded-xl border border-secondary/10">
            <button 
              onClick={() => setActiveRole(UserRole.OPERATOR)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeRole === UserRole.OPERATOR ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            >
              Operatorlar
            </button>
            <button 
              onClick={() => setActiveRole(UserRole.COURIER)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeRole === UserRole.COURIER ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
            >
              Kuryerlar
            </button>
          </div>

          <div className="relative" ref={dateRef}>
            <button 
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-2 bg-background border-none rounded-xl px-4 py-2.5 text-xs font-bold outline-none hover:bg-white transition-all min-w-[180px] justify-between shadow-inner text-primary uppercase tracking-wide"
            >
              <span className="truncate max-w-[140px]">{formatDisplayDate()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-secondary transition-transform ${isDateOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {isDateOpen && (
              <div className="absolute top-full right-0 mt-2 bg-surface border border-white/50 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 w-[280px]">
                {activeRole === UserRole.OPERATOR ? (
                  <input 
                    type="month" 
                    value={month}
                    onChange={(e) => { setMonth(e.target.value); setIsDateOpen(false); }}
                    className="bg-background border-none rounded-xl px-4 py-3 text-sm font-bold outline-none w-full text-primary"
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setWeek(shiftWeek(week, -1))} aria-label="Oldingi hafta"
                        className="p-2 rounded-lg bg-background text-secondary hover:text-primary hover:bg-white transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                      </button>
                      {/* Kalendar: tanlangan kun o'sha haftaning Yakshanbasiga tushadi */}
                      <label className="relative flex flex-col items-center flex-1 cursor-pointer rounded-lg py-1 hover:bg-background transition-all"
                        title="Kalendardan tanlang — hafta Yakshanbadan boshlanadi">
                        <span className="text-sm font-black text-primary tracking-tight">{weekRangeLabel(week)}</span>
                        <span className="text-[9px] text-secondary font-bold uppercase tracking-widest">Yakshanba — Shanba</span>
                        <input type="date" value={week}
                          onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                          onChange={(e) => e.target.value && setWeek(weekStartFromDateStr(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Kalendardan tanlash" />
                      </label>
                      <button onClick={() => setWeek(shiftWeek(week, 1))} aria-label="Keyingi hafta"
                        className="p-2 rounded-lg bg-background text-secondary hover:text-primary hover:bg-white transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    </div>
                    <button
                      onClick={() => { setWeek(weekStartOf()); }}
                      className="w-full text-[11px] text-secondary hover:text-primary font-bold py-1 rounded-lg hover:bg-background transition-all"
                    >
                      Shu hafta
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={handleConfirmAll}
            className="flex items-center gap-2 bg-accent text-primary border border-accentHover px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accentHover transition-all shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Barchasini Tasdiqlash
          </button>

          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 bg-surface text-primary border border-secondary/20 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-background transition-all shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            PDF
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden p-2">
        {loading ? (
          <div className="p-20 text-center text-secondary font-bold">Ma'lumotlar tahlil qilinmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              {/* OPERATOR HEADER */}
              {activeRole === UserRole.OPERATOR && (
                <thead className="bg-background text-secondary">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">O'rin</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Skript (30%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Sifat (20%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Intizom (15%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Buyurtma (12.5%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Tezlik (12.5%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Chek (10%)</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Yakuniy Ball</th>
                  </tr>
                </thead>
              )}
              {/* COURIER HEADER */}
              {activeRole === UserRole.COURIER && (
                <thead className="bg-background text-secondary">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">O'rin</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Buyurtma Soni</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Tafsilotlar</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">O'rtacha Tezlik</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Maxsus Bonus</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Qo'shimcha</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Jami Daromad</th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-background">
                {reports.map((rep, idx) => (
                  <tr key={rep.user.id} className="hover:bg-background/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs ${
                        idx < 3 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-background text-secondary'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center font-black text-secondary text-sm border border-white/50 shadow-sm">
                          {rep.user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">{rep.user.fullName}</p>
                          <p className="text-xs text-secondary font-medium tracking-wide">ID: {rep.user.id.slice(-4)}</p>
                          {rep.facts?.isConfirmed && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-widest rounded-md border border-emerald-200">
                              Tasdiqlangan
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* OPERATOR DATA */}
                    {activeRole === UserRole.OPERATOR && (
                      <>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.script || '-'}</td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.errors || '-'}</td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.discipline || '-'}</td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.orders || '-'}</td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.speed || '-'}</td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.scores?.check || '-'}</td>
                        <td className="px-6 py-5 text-right">
                          <span className={`px-4 py-2 rounded-xl text-base font-black border ${getStatusColor(Number(rep.finalScore))}`}>
                            {Number(rep.finalScore).toFixed(2)}
                          </span>
                        </td>
                      </>
                    )}

                    {/* COURIER DATA */}
                    {activeRole === UserRole.COURIER && (
                      <>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.facts?.totalOrders || 0}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {Object.entries(rep.facts?.priceStats || {}).map(([price, count]) => (
                              <span key={price} className="text-[10px] font-bold bg-background px-2 py-0.5 rounded text-secondary whitespace-nowrap border border-white/50">
                                {Number(price).toLocaleString()} so'm: {count} ta
                              </span>
                            ))}
                            {Object.keys(rep.facts?.priceStats || {}).length === 0 && <span className="text-xs text-slate-300">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-secondary group-hover:text-primary transition-colors">{rep.facts?.avgSpeedMinutes || 0} min</td>
                        <td className="px-6 py-5 text-center font-bold text-purple-600">+{rep.facts?.specialBonusCount || 0}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {editingUsers.has(rep.user.id) ? (
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number"
                                  className="w-20 bg-white border-2 border-accent rounded-lg px-2 py-1 text-center font-bold text-primary outline-none shadow-lg"
                                  value={bonusValues[rep.user.id] || ''}
                                  onChange={(e) => handleBonusChange(rep.user.id, e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && toggleEdit(rep.user.id, 0)}
                                  autoFocus
                                />
                                <button 
                                  onClick={() => toggleEdit(rep.user.id, 0)}
                                  className="p-1.5 bg-accent text-primary rounded-lg hover:bg-accentHover shadow-md"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/edit">
                                <span className={`font-bold ${
                                  (rep.facts?.manualBonus || 0) > 0 ? 'text-emerald-600' : 
                                  (rep.facts?.manualBonus || 0) < 0 ? 'text-rose-600' : 'text-secondary'
                                }`}>
                                  {(rep.facts?.manualBonus || 0) > 0 ? '+' : ''}{(rep.facts?.manualBonus || 0).toLocaleString()}
                                </span>
                                {!rep.facts?.isConfirmed && (
                                  <button 
                                    onClick={() => toggleEdit(rep.user.id, rep.facts?.manualBonus || 0)}
                                    className="p-1.5 rounded-lg bg-background text-secondary hover:bg-accent/20 hover:text-primary transition-all opacity-0 group-hover/edit:opacity-100"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-primary text-lg">
                          {(rep.facts?.totalEarnings || 0).toLocaleString()} UZS
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-secondary font-bold">
                      Ushbu davr uchun ma'lumot topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKPIReports;
