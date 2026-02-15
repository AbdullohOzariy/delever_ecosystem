import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import Dropdown from './ui/Dropdown';
import Toast from './ui/Toast';

interface Order {
  id: string;
  amount: number;
  deliveryPrice: number;
  deliveryType: string;
  branch?: string; 
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
  const [showHelp, setShowHelp] = useState(false); 

  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('all'); 
  const [filterBranch, setFilterBranch] = useState('all'); 
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
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

        newOrders.push({
          id: cols[1]?.replace(/"/g, '').trim(), 
          operatorName: cols[2]?.replace(/"/g, '').trim(), 
          branch: cols[3]?.replace(/"/g, '').trim(), 
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
      const matchesBranch = filterBranch === 'all' || o.branch === filterBranch; 

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

      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Master Baza</h2>
          <p className="text-secondary font-medium mt-1 text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
            {filteredOrders.length.toLocaleString()} ta buyurtma (Jami: {orders.length})
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowHelp(true)}
            className="px-4 py-3 bg-background text-secondary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 border border-transparent hover:border-secondary/20 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            Yo'riqnoma
          </button>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${showFilters ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface text-secondary border-secondary/20 hover:bg-background'}`}
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
            className="px-6 py-3 bg-accent text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accentHover transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95"
          >
            {isParsing ? 'Tekshirilmoqda...' : 'CSV Yuklash'}
          </button>
          
          <button 
            onClick={handleDeleteAll}
            className="px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Tozalash
          </button>
        </div>
      </header>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-2xl rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-primary uppercase tracking-tight">CSV Yuklash Tartibi</h3>
              <button onClick={() => setShowHelp(false)} className="p-2 bg-background rounded-xl hover:bg-secondary/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-6 text-sm text-secondary font-medium">
              <p>
                Tizimga ma'lumotlarni yuklash uchun <b>.csv</b> formatidagi fayldan foydalaning. 
                Faylning birinchi qatori (sarlavha) quyidagicha bo'lishi <b>SHART</b>:
              </p>

              <div className="bg-background p-4 rounded-2xl font-mono text-xs break-all border border-secondary/10 text-primary">
                {EXPECTED_HEADER}
              </div>

              <div>
                <h4 className="font-bold text-primary mb-2 uppercase tracking-widest text-xs">Ustunlar tavsifi:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>№</b>: Tartib raqami (ixtiyoriy, lekin bo'lishi kerak)</li>
                  <li><b>Ид.заказа</b>: Buyurtma ID raqami (unikal bo'lishi kerak)</li>
                  <li><b>Оператор</b>: Operatorning to'liq ismi (F.I.SH)</li>
                  <li><b>Название филиала</b>: Filial nomi (masalan: Chilonzor)</li>
                  <li><b>Тип доставки</b>: "Доставка" yoki "Самовывоз"</li>
                  <li><b>Курьер</b>: Kuryerning to'liq ismi (agar bo'lsa)</li>
                  <li><b>Источник</b>: Buyurtma manbasi (masalan: App, Bot)</li>
                  <li><b>Тип платежа</b>: Naqd, Click, Payme...</li>
                  <li><b>Цена заказа</b>: Buyurtma summasi (faqat raqam)</li>
                  <li><b>Цена доставки</b>: Yetkazib berish narxi (faqat raqam)</li>
                  <li><b>Новый заказ</b>: Sana va vaqt (YYYY-MM-DD HH:mm:ss)</li>
                  <li><b>Итоговое время</b>: Yetkazib berish vaqti (HH:mm:ss)</li>
                </ul>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-800">
                <p className="font-black mb-1 uppercase tracking-widest text-xs">⚠️ Muhim eslatmalar:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs font-bold">
                  <li>Fayl kodirovkasi <b>UTF-8</b> bo'lishi kerak.</li>
                  <li>Sana formati <b>2024-03-21 14:30:00</b> kabi bo'lishi kerak.</li>
                  <li>Narx ustunlarida so'm belgisi yoki bo'sh joy bo'lmasligi kerak (faqat raqam).</li>
                  <li>Agar operator yoki kuryer tizimda topilmasa, ular avtomatik yaratiladi (parol: 123456).</li>
                </ul>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-secondary transition-all shadow-lg mt-6 active:scale-95"
            >
              Tushunarli
            </button>
          </div>
        </div>
      )}

      {/* FILTERS PANEL */}
      {showFilters && (
        <div className="bg-surface p-8 rounded-4xl border border-white/50 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1-Qator: Qidiruv va Sana */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Qidiruv</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="ID, Operator, Kuryer..." 
                    className="w-full bg-background border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 transition-all pl-12 text-primary placeholder-secondary/50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <svg className="absolute left-4 top-4 text-secondary" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Sana Oralig'i</label>
                <div className="flex gap-3">
                  <input 
                    type="date" 
                    className="w-full bg-background border-none rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/50 transition-all text-primary"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <input 
                    type="date" 
                    className="w-full bg-background border-none rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/50 transition-all text-primary"
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
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Summa (UZS)</label>
                <div className="flex gap-3">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="w-full bg-background border-none rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/50 transition-all text-primary"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  />
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="w-full bg-background border-none rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-accent/50 transition-all text-primary"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden overflow-x-auto p-2">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-background text-secondary">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">ID</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Operator / Kuryer</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Filial</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Turi</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Vaqt</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Summa / Dostavka</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background">
            {filteredOrders.map((ord) => (
              <tr key={ord.id} className="hover:bg-background/50 transition-colors group">
                <td className="px-8 py-5 font-black text-primary">#{ord.id}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-primary">{ord.operator?.fullName || '---'}</span>
                    <span className="text-[10px] text-secondary font-bold uppercase flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                      {ord.courier?.fullName || '---'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="text-xs font-bold text-secondary bg-background px-2 py-1 rounded-lg border border-secondary/10">
                    {ord.branch || '-'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                    ord.deliveryType === 'Самовывоз' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {ord.deliveryType || '-'}
                  </span>
                </td>
                <td className="px-6 py-5 text-center font-bold text-secondary font-mono">
                  {formatTime(ord.deliveryTimeSeconds)}
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-black text-primary">{ord.amount.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-secondary bg-background px-1.5 py-0.5 rounded border border-secondary/10">
                      + {ord.deliveryPrice.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right text-xs font-bold text-secondary">
                  {new Date(ord.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-secondary font-bold">
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
