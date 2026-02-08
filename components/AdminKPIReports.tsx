import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminKPIReportsProps {
  users: User[];
}

const AdminKPIReports: React.FC<AdminKPIReportsProps> = ({ users }) => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
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

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const targetUsers = users.filter(u => u.role === activeRole);
      
      const promises = targetUsers.map(async (user) => {
        try {
          let periodQuery = `month=${month}`;
          
          if (activeRole === UserRole.COURIER) {
            const monday = getDateFromWeek(week);
            const dateStr = monday.toISOString().slice(0, 10);
            periodQuery = `period=weekly&week=${dateStr}`;
          }

          const res = await fetch(`http://localhost:3001/api/kpi/report/${user.id}?${periodQuery}`);
          const data = await res.json();
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

  const handleConfirm = async (userId: string) => {
    if (week === getCurrentWeek()) {
      setToast({ message: "Joriy haftani tasdiqlab bo'lmaydi.", type: 'error' });
      return;
    }
    
    if (confirm("Tasdiqlaysizmi?")) {
      try {
        const monday = getDateFromWeek(week);
        const dateStr = monday.toISOString().slice(0, 10);

        await api.confirmKPI({ userId, week: dateStr });
        setToast({ message: "Tasdiqlandi!", type: 'success' });
        
        const newEditing = new Set(editingUsers);
        newEditing.delete(userId);
        setEditingUsers(newEditing);

        setReports(prev => prev.map(rep => {
          if (rep.user.id === userId) {
            return { ...rep, facts: { ...rep.facts, isConfirmed: true } };
          }
          return rep;
        }));

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
      const monday = getDateFromWeek(week);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5); 
      const dateStr = saturday.toISOString().slice(0, 10);

      await api.saveDailyKPI({
        userId,
        date: dateStr,
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
    const periodText = activeRole === UserRole.OPERATOR ? `Oy: ${month}` : `Hafta: ${week} (${getWeekRangeDisplay(week)})`;
    doc.text(periodText, 14, 30);

    const tableColumn = activeRole === UserRole.OPERATOR 
      ? ["Xodim", "Skript", "Sifat", "Intizom", "Buyurtma", "Tezlik", "Chek", "Yakuniy Ball"]
      : ["Xodim", "Buyurtma Soni", "Tafsilotlar", "O'rtacha Tezlik", "Tezlik Bonusi", "Maxsus Bonus", "Qo'shimcha", "Jami Daromad"];

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
          rep.facts?.speedBonusCount || 0,
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
    if (score >= 4.8) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (score >= 4.5) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (score >= 4.0) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 3.5) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const formatDisplayDate = () => {
    if (activeRole === UserRole.OPERATOR) {
      const [y, m] = month.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1);
      return date.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
    } else {
      return `${week}-hafta (${getWeekRangeDisplay(week)})`;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">KPI Umumiy Hisobot</h2>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
            {activeRole === UserRole.OPERATOR ? 'Oylik Sifat Nazorati' : 'Haftalik Yetkazib Berish Hisoboti'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            PDF Yuklash
          </button>

          <div className="relative" ref={dateRef}>
            <button 
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none hover:bg-slate-100 transition-all min-w-[220px] justify-between"
            >
              <span className="capitalize truncate max-w-[180px]">{formatDisplayDate()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`text-slate-400 transition-transform ${isDateOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>

            {isDateOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 w-[300px]">
                {activeRole === UserRole.OPERATOR ? (
                  <input 
                    type="month" 
                    value={month}
                    onChange={(e) => { setMonth(e.target.value); setIsDateOpen(false); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none w-full"
                  />
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="week" 
                      value={week}
                      onChange={(e) => { setWeek(e.target.value); setIsDateOpen(false); }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none w-full"
                    />
                    <p className="text-xs text-slate-500 text-center font-medium">
                      {getWeekRangeDisplay(week)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveRole(UserRole.OPERATOR)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeRole === UserRole.OPERATOR ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Operatorlar
            </button>
            <button 
              onClick={() => setActiveRole(UserRole.COURIER)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeRole === UserRole.COURIER ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Kuryerlar
            </button>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold">Ma'lumotlar tahlil qilinmoqda...</div>
        ) : (
          <table className="w-full text-left min-w-[1000px]">
            {/* OPERATOR HEADER */}
            {activeRole === UserRole.OPERATOR && (
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">O'rin</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Skript (30%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Sifat (20%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Intizom (15%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Buyurtma (12.5%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Tezlik (12.5%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Chek (10%)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Yakuniy Ball</th>
                </tr>
              </thead>
            )}
            {/* COURIER HEADER */}
            {activeRole === UserRole.COURIER && (
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">O'rin</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Buyurtma Soni</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Tafsilotlar</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">O'rtacha Tezlik</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Tezlik Bonusi</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Maxsus Bonus</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Qo'shimcha</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Jami Daromad</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Amal</th>
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-50">
              {reports.map((rep, idx) => (
                <tr key={rep.user.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs ${
                      idx < 3 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">
                        {rep.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{rep.user.fullName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">ID: {rep.user.id.slice(-4)}</p>
                      </div>
                    </div>
                  </td>
                  
                  {/* OPERATOR DATA */}
                  {activeRole === UserRole.OPERATOR && (
                    <>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.script || '-'}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.errors || '-'}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.discipline || '-'}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.orders || '-'}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.speed || '-'}</td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.scores?.check || '-'}</td>
                      <td className="px-6 py-5 text-right">
                        <span className={`px-4 py-2 rounded-xl text-sm font-black ${getStatusColor(Number(rep.finalScore))}`}>
                          {Number(rep.finalScore).toFixed(2)}
                        </span>
                      </td>
                    </>
                  )}

                  {/* COURIER DATA */}
                  {activeRole === UserRole.COURIER && (
                    <>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.facts?.totalOrders || 0}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {Object.entries(rep.facts?.priceStats || {}).map(([price, count]) => (
                            <span key={price} className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 whitespace-nowrap">
                              {Number(price).toLocaleString()} so'm: {count} ta
                            </span>
                          ))}
                          {Object.keys(rep.facts?.priceStats || {}).length === 0 && <span className="text-xs text-slate-300">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-600">{rep.facts?.avgSpeedMinutes || 0} min</td>
                      <td className="px-6 py-5 text-center font-bold text-emerald-600">+{rep.facts?.speedBonusCount || 0}</td>
                      <td className="px-6 py-5 text-center font-bold text-purple-600">+{rep.facts?.specialBonusCount || 0}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingUsers.has(rep.user.id) ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                className="w-20 bg-white border-2 border-blue-500 rounded-lg px-2 py-1 text-center font-bold text-blue-600 outline-none shadow-lg"
                                value={bonusValues[rep.user.id] || ''}
                                onChange={(e) => handleBonusChange(rep.user.id, e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && toggleEdit(rep.user.id, 0)}
                                autoFocus
                              />
                              <button 
                                onClick={() => toggleEdit(rep.user.id, 0)}
                                className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-md"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/edit">
                              <span className={`font-bold ${
                                (rep.facts?.manualBonus || 0) > 0 ? 'text-emerald-600' : 
                                (rep.facts?.manualBonus || 0) < 0 ? 'text-rose-600' : 'text-slate-400'
                              }`}>
                                {(rep.facts?.manualBonus || 0) > 0 ? '+' : ''}{(rep.facts?.manualBonus || 0).toLocaleString()}
                              </span>
                              {!rep.facts?.isConfirmed && (
                                <button 
                                  onClick={() => toggleEdit(rep.user.id, rep.facts?.manualBonus || 0)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-all opacity-0 group-hover/edit:opacity-100"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-blue-600 text-lg">
                        {(rep.facts?.totalEarnings || 0).toLocaleString()} UZS
                      </td>
                      <td className="px-6 py-5 text-right">
                        {rep.facts?.isConfirmed ? (
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-emerald-200">
                            Tasdiqlangan
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleConfirm(rep.user.id)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-slate-900/20"
                          >
                            Tasdiqlash
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-slate-400 font-bold">
                    Ushbu davr uchun ma'lumot topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminKPIReports;
