import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import Toast from './ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashierPortal: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filterStatus]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await api.getPayments(filterStatus);
      setPayments(data);
      setSelectedPayments(new Set()); // Reset selection
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

  const handleCancel = async (id: string) => {
    if (confirm("To'lovni bekor qilasizmi? KPI qayta ochiladi.")) {
      try {
        // @ts-ignore
        await api.cancelPayment(id); // api.ts da cancelPayment qo'shilgan bo'lishi kerak
        setToast({ message: "To'lov bekor qilindi", type: 'info' });
        loadPayments();
      } catch (error) {
        setToast({ message: "Bekor qilishda xatolik", type: 'error' });
      }
    }
  };

  const handleBulkPay = async () => {
    if (selectedPayments.size === 0) return;
    
    if (confirm(`${selectedPayments.size} ta to'lovni tasdiqlaysizmi?`)) {
      try {
        // Hozircha bittalab chaqiramiz (Backendda bulk pay yo'q)
        for (const id of selectedPayments) {
          await api.payPayment(id);
        }
        setToast({ message: "Barcha to'lovlar amalga oshirildi", type: 'success' });
        loadPayments();
      } catch (error) {
        setToast({ message: "Ba'zi to'lovlarda xatolik bo'ldi", type: 'error' });
        loadPayments();
      }
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPayments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPayments.size === filteredPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(filteredPayments.map(p => p.id)));
    }
  };

  const exportDailyReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('uz-UZ');
    
    doc.setFontSize(18);
    doc.text(`Kassa Hisoboti: ${today}`, 14, 22);
    
    const tableColumn = ["Xodim", "Davr", "Summa", "Imzo"];
    const tableRows = payments.map(p => [
      p.user.fullName,
      p.period,
      `${Number(p.amount).toLocaleString()} UZS`,
      "" // Imzo uchun bo'sh joy
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        3: { minCellHeight: 15 } // Imzo uchun balandroq joy
      }
    });

    doc.save(`kassa_hisobot_${today}.pdf`);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => 
      p.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.period.includes(search)
    );
  }, [payments, search]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50">
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Jami Summa ({filterStatus === 'PENDING' ? 'Kutilmoqda' : 'To\'langan'})</p>
          <p className="text-3xl font-black text-primary tracking-tight">{totalAmount.toLocaleString()} <span className="text-sm text-secondary">UZS</span></p>
        </div>
        <div className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50">
          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">To'lovlar Soni</p>
          <p className="text-3xl font-black text-primary tracking-tight">{filteredPayments.length} <span className="text-sm text-secondary">ta</span></p>
        </div>
        <div className="bg-accent p-6 rounded-4xl shadow-lg shadow-accent/20 flex flex-col justify-center items-center text-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={exportDailyReport}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          <p className="font-black text-primary uppercase tracking-widest text-xs">Kunlik Hisobot (PDF)</p>
        </div>
      </div>

      <header className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Qidiruv..." 
            className="w-full md:w-64 bg-background border-none rounded-2xl px-5 py-3 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary placeholder-secondary/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-4 top-3.5 text-secondary" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedPayments.size > 0 && filterStatus === 'PENDING' && (
            <button 
              onClick={handleBulkPay}
              className="bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Tanlanganlarni To'lash ({selectedPayments.size})
            </button>
          )}

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
                  <th className="px-6 py-4 text-center w-16 rounded-l-2xl">
                    {filterStatus === 'PENDING' && (
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-secondary/30 text-accent focus:ring-accent"
                        checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                        onChange={toggleSelectAll}
                      />
                    )}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Xodim</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Davr</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Summa</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Holat</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className={`hover:bg-background/50 transition-colors group ${selectedPayments.has(payment.id) ? 'bg-accent/5' : ''}`}>
                    <td className="px-6 py-5 text-center">
                      {filterStatus === 'PENDING' && (
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-secondary/30 text-accent focus:ring-accent"
                          checked={selectedPayments.has(payment.id)}
                          onChange={() => toggleSelect(payment.id)}
                        />
                      )}
                    </td>
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
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleCancel(payment.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-100"
                            title="Bekor qilish"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                          </button>
                          <button 
                            onClick={() => handlePay(payment.id)}
                            disabled={!payment.feedbackCompleted}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                              payment.feedbackCompleted 
                                ? 'bg-primary text-white hover:bg-accent hover:text-primary shadow-lg shadow-primary/20 active:scale-95 border-transparent' 
                                : 'bg-background text-secondary border-secondary/10 cursor-not-allowed'
                            }`}
                          >
                            {payment.feedbackCompleted ? "To'lash" : "Baholash"}
                          </button>
                        </div>
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
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-secondary font-bold">
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
