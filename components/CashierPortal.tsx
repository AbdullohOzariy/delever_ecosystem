import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Toast from './ui/Toast';

const CashierPortal: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filterStatus]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await api.getPayments(filterStatus);
      setPayments(data);
    } catch (error) {
      console.error("To'lovlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    if (confirm("To'lovni tasdiqlaysizmi?")) {
      try {
        await api.payPayment(id);
        setToast({ message: "To'lov amalga oshirildi", type: 'success' });
        loadPayments();
      } catch (error) {
        setToast({ message: "Xatolik: Xodim baholashni yakunlamagan bo'lishi mumkin", type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Kassa</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            To'lovlar va Hisob-kitoblar
          </p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setFilterStatus('PENDING')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterStatus === 'PENDING' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            Kutilmoqda
          </button>
          <button 
            onClick={() => setFilterStatus('PAID')}
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterStatus === 'PAID' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            To'langan
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400 dark:text-slate-500 font-bold">Yuklanmoqda...</div>
        ) : (
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-b-2 border-slate-900 dark:border-slate-700">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Davr</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Summa</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Holat</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{payment.user.fullName}</span>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {payment.user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {payment.period}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white text-lg">
                    {Number(payment.amount).toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border-2 ${
                      payment.status === 'PAID' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    {payment.status === 'PENDING' && (
                      <button 
                        onClick={() => handlePay(payment.id)}
                        disabled={!payment.feedbackCompleted}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border-2 ${
                          payment.feedbackCompleted 
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white hover:bg-emerald-600 dark:hover:bg-emerald-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {payment.feedbackCompleted ? "To'lash" : "Baholash Kutilmoqda"}
                      </button>
                    )}
                    {payment.status === 'PAID' && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        To'landi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 dark:text-slate-600 font-bold">
                    Ma'lumot topilmadi.
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
