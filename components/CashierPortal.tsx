import React, { useState, useEffect, useMemo } from 'react';
import { ICONS } from '../constants';
import { PayoutStatus, PaymentRecord } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

const CashierPortal: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  // NEW FILTERS
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const status = filter === 'ALL' ? undefined : filter;
      const data = await api.getPayments(status);
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string, feedbackCompleted: boolean) => {
    if (!feedbackCompleted) {
      setToast({ message: "Xodim baholashni yakunlamagan. To'lov bloklangan.", type: 'error' });
      return;
    }

    if (confirm("To'lovni tasdiqlaysizmi?")) {
      try {
        await api.payPayment(id);
        setToast({ message: "To'lov muvaffaqiyatli amalga oshirildi!", type: 'success' });
        loadPayments();
      } catch (error) {
        setToast({ message: "Xatolik yuz berdi", type: 'error' });
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'PAID') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200';
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = p.user.fullName.toLowerCase().includes(search.toLowerCase());
      const matchesDate = !date || (p.processedAt && p.processedAt.startsWith(date)) || p.period.includes(date);
      return matchesSearch && matchesDate;
    });
  }, [payments, search, date]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Kassa: To'lovlar</h2>
            <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
              Xodimlarga ish haqi va bonuslar to'lovi
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setFilter('PENDING')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              To'lanishi kerak
            </button>
            <button 
              onClick={() => setFilter('PAID')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'PAID' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Tarix (To'langan)
            </button>
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Barchasi
            </button>
          </div>
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Xodim ismini qidirish..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="absolute left-3 top-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
          </div>
          <div className="relative w-full md:w-48">
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold">Yuklanmoqda...</div>
        ) : (
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Davr</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Summa</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Baholash</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Amallar / Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">
                        {payment.user.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{payment.user.fullName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{payment.user.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-600">
                    {payment.period}
                  </td>
                  <td className="px-8 py-5 text-center font-black text-lg text-slate-900">
                    {Number(payment.amount).toLocaleString()} UZS
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(payment.status)}`}>
                      {payment.status === 'PENDING' ? 'Kutilmoqda' : 'To\'landi'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {payment.feedbackCompleted ? (
                      <span className="text-emerald-500 font-bold text-xs">✅ Yakunlangan</span>
                    ) : (
                      <span className="text-rose-500 font-bold text-xs">❌ Kutilmoqda</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    {payment.status === 'PENDING' && (
                      <button 
                        onClick={() => handlePay(payment.id, payment.feedbackCompleted)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                          payment.feedbackCompleted 
                            ? 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-900/20' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        To'lash
                      </button>
                    )}
                    {payment.status === 'PAID' && (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(payment.processedAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(payment.processedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 font-bold">
                    To'lovlar topilmadi
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

export default CashierPortal;
