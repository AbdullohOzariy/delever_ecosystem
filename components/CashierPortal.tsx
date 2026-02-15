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

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Kassa</h2>
          <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
            To'lovlar va Hisob-kitoblar
          </p>
        </div>
        
        <div className="flex bg-background p-1.5 rounded-2xl border border-secondary/10">
          <button 
            onClick={() => setFilterStatus('PENDING')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === 'PENDING' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            Kutilmoqda
          </button>
          <button 
            onClick={() => setFilterStatus('PAID')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === 'PAID' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-primary'}`}
          >
            To'langan
          </button>
        </div>
      </header>

      <div className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden p-2">
        {loading ? (
          <div className="p-20 text-center text-secondary font-bold">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-background text-secondary">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">Xodim</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Davr</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Summa</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Holat</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-background/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary text-sm">{payment.user.fullName}</span>
                        <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                          {payment.user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-secondary">
                      {payment.period}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-primary text-lg">
                      {Number(payment.amount).toLocaleString()} UZS
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-widest border ${
                        payment.status === 'PAID' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {payment.status === 'PENDING' && (
                        <button 
                          onClick={() => handlePay(payment.id)}
                          disabled={!payment.feedbackCompleted}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                            payment.feedbackCompleted 
                              ? 'bg-primary text-white hover:bg-accent hover:text-primary shadow-lg shadow-primary/20 active:scale-95 border-transparent' 
                              : 'bg-background text-secondary border-secondary/10 cursor-not-allowed'
                          }`}
                        >
                          {payment.feedbackCompleted ? "To'lash" : "Baholash Kutilmoqda"}
                        </button>
                      )}
                      {payment.status === 'PAID' && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          To'landi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-secondary font-bold">
                      Ma'lumot topilmadi.
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

export default CashierPortal;
