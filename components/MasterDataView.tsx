import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import Dropdown from './ui/Dropdown';
import Toast from './ui/Toast';

interface Order {
  id: string;
  amount: number;
  deliveryPrice: number;
  deliveryType: string;
  branch?: string; // YANGI
  createdAt: string;
  deliveryTimeSeconds: number;
  status: string;
  operator?: { fullName: string };
  courier?: { fullName: string };
}

const EXPECTED_HEADER = "№,Ид.заказа,Оператор,Название филиала,Тип доставки,Курьер,Источник,Тип платежа,Цена заказа,Цена доставки,Новый заказ,Итоговое время";

const MasterDataView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('all'); 
  const [filterBranch, setFilterBranch] = useState('all'); // YANGI
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      console.log("Yuklangan buyurtmalar:", data); // DEBUG
      setOrders(data);
    } catch (error) {
      console.error("Buyurtmalarni yuklashda xatolik:", error);
    }
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(':');
    if (parts.length === 3) return (+parts[0] * 3600) + (+parts[1] * 60) + (+parts[2]);
    if (parts.length === 2) return (+parts[0] * 60) + (+parts[1]);
    return 0;
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '0:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const processCSV = async (csvText: string) => {
    setIsParsing(true);
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setToast({ message: "Fayl bo'sh yoki noto'g'ri formatda!", type: 'error' });
        return;
      }

      const header = lines[0].trim();
      const cleanHeader = header.replace(/^\uFEFF/, '');
      
      if (cleanHeader !== EXPECTED_HEADER) {
        const expectedCols = EXPECTED_HEADER.split(',');
        const actualCols = cleanHeader.split(',');
        
        if (actualCols.length !== expectedCols.length) {
           setToast({ message: `CSV sarlavhasi xato! Kutilgan ustunlar soni: ${expectedCols.length}, Kelgan: ${actualCols.length}`, type: 'error' });
        } else {
           setToast({ message: "CSV sarlavhasi shablonga mos kelmadi. Iltimos, shablonni tekshiring.", type: 'error' });
        }
        return;
      }

      const newOrders: any[] = [];
      let errorCount = 0;
      let firstError = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        
        if (cols.length < 12) {
          errorCount++;
          if (!firstError) firstError = `${i+1}-qatorda ustunlar yetishmayapti`;
          continue;
        }

        const amount = parseFloat(cols[8]); 
        if (isNaN(amount)) {
           errorCount++;
           if (!firstError) firstError = `${i+1}-qatorda 'Narx' noto'g'ri formatda`;
           continue;
        }

        // DEBUG: Branch ni tekshirish
        // console.log(`Qator ${i}: Branch = ${cols[3]}`);

        newOrders.push({
          id: cols[1]?.replace(/"/g, '').trim(), 
          operatorName: cols[2]?.replace(/"/g, '').trim(), 
          branch: cols[3]?.replace(/"/g, '').trim(), // YANGI: Filial
          deliveryType: cols[4]?.replace(/"/g, '').trim(),
          courierName: cols[5]?.replace(/"/g, '').trim(),
          amount: amount,
          deliveryPrice: parseFloat(cols[9]) || 0,
          createdAt: cols[10]?.replace(/"/g, '').trim(),
          deliveryTimeSeconds: parseTimeToSeconds(cols[11]?.replace(/"/g, '').trim())
        });
      }

      if (errorCount > 0) {
        setToast({ message: `Diqqat! ${errorCount} ta qator o'tkazib yuborildi. Xato: ${firstError}`, type: 'info' });
      }

      if (newOrders.length === 0) {
        setToast({ message: "Faylda yaroqli ma'lumot topilmadi.", type: 'error' });
        return;
      }

      const response = await api.importOrders(newOrders);
      
      if (response.error) {
        setToast({ message: `Yangi xodimlar topildi: ${response.newOperators?.length || 0} operator, ${response.newCouriers?.length || 0} kuryer. Iltimos, ularni Xodimlar bo'limida yarating.`, type: 'info' });
      } else {
        setToast({ message: `Import yakunlandi! Qo'shildi: ${response.added}`, type: 'success' });
        loadOrders();
      }
      
    } catch (error) {
      setToast({ message: "Import qilishda xatolik yuz berdi.", type: 'error' });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("DIQQAT! Barcha buyurtmalar o'chib ketadi.\nBu amalni ortga qaytarib bo'lmaydi.\n\nDavom etasizmi?")) {
      try {
        await api.deleteAllOrders();
        setToast({ message: "Barcha buyurtmalar o'chirildi.", type: 'info' });
        loadOrders();
      } catch (error) {
        setToast({ message: "O'chirishda xatolik yuz berdi.", type: 'error' });
      }
    }
  };

  // Unique Branches
  const uniqueBranches = useMemo(() => {
    const branches = new Set(orders.map(o => o.branch).filter(Boolean));
    return ['all', ...Array.from(branches)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = !search || 
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        (o.operator?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.courier?.fullName || '').toLowerCase().includes(search.toLowerCase());

      const orderDate = new Date(o.createdAt);
      const matchesStart = !dateRange.start || orderDate >= new Date(dateRange.start);
      const matchesEnd = !dateRange.end || orderDate <= new Date(new Date(dateRange.end).setHours(23, 59, 59));

      const matchesType = filterType === 'all' || o.deliveryType === filterType;
      const matchesBranch = filterBranch === 'all' || o.branch === filterBranch; // YANGI

      const matchesMin = !priceRange.min || o.amount >= Number(priceRange.min);
      const matchesMax = !priceRange.max || o.amount <= Number(priceRange.max);

      return matchesSearch && matchesStart && matchesEnd && matchesType && matchesBranch && matchesMin && matchesMax;
    });
  }, [orders, search, dateRange, filterType, filterBranch, priceRange]);

  const typeOptions = [
    { value: 'all', label: 'Barchasi' },
    { value: 'Доставка', label: 'Доставка', icon: '🛵' },
    { value: 'Самовывоз', label: 'Самовывоз', icon: '🏃' }
  ];

  const branchOptions = uniqueBranches.map(b => ({ value: b as string, label: b === 'all' ? 'Barcha Filiallar' : (b as string) }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Master Baza</h2>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            {filteredOrders.length.toLocaleString()} ta buyurtma (Jami: {orders.length})
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${showFilters ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filtr
          </button>

          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const r = new FileReader(); r.onload = (ev) => processCSV(ev.target?.result as string); r.readAsText(file);
            }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {isParsing ? 'Tekshirilmoqda...' : 'CSV Yuklash'}
          </button>
          
          <button 
            onClick={handleDeleteAll}
            className="px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Tozalash
          </button>
        </div>
      </header>

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1-Qator: Qidiruv va Sana */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qidiruv</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="ID, Operator, Kuryer..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all pl-12"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <svg className="absolute left-4 top-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sana Oralig'i</label>
                <div className="flex gap-3">
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 2-Qator: Turi, Filial va Summa */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Dropdown 
                    label="Yetkazish Turi"
                    options={typeOptions}
                    value={filterType}
                    onChange={setFilterType}
                  />
                </div>
                <div className="space-y-3">
                  <Dropdown 
                    label="Filial"
                    options={branchOptions}
                    value={filterBranch}
                    onChange={setFilterBranch}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Summa (UZS)</label>
                <div className="flex gap-3">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">ID</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Operator / Kuryer</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Filial</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Turi</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Vaqt</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Summa / Dostavka</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredOrders.map((ord) => (
              <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-black text-slate-900">#{ord.id}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-slate-800">{ord.operator?.fullName || '---'}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                      {ord.courier?.fullName || '---'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                    {ord.branch || '-'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    ord.deliveryType === 'Самовывоз' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ord.deliveryType || '-'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center font-bold text-slate-600">
                  {formatTime(ord.deliveryTimeSeconds)}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-black text-slate-900">{ord.amount.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      + {ord.deliveryPrice.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">
                  {new Date(ord.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400 font-bold">
                  Ma'lumot topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MasterDataView;
