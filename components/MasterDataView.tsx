import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api';
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

// ---------------------------------------------------------
// USTUNLARNI SARLAVHA NOMI BO'YICHA TOPISH
// Fayl shablon.xlsx kabi kelishi mumkin — tizim kerakli ustunlarni
// nomi bo'yicha qidirib topadi, ortiqcha ustunlarni e'tiborsiz qoldiradi.
// Ustun tartibi muhim emas.
// ---------------------------------------------------------
const COLUMN_ALIASES: Record<string, string[]> = {
  id:                  ['ид заказа', 'ид.заказа', 'идзаказа', 'id заказа', 'order id', 'orderid', 'идентификатор'],
  operatorName:        ['оператор', 'operator'],
  branch:              ['название филиала', 'филиал', 'branch', 'магазин'],
  deliveryType:        ['тип доставки', 'доставка', 'delivery type'],
  courierName:         ['курьер', 'courier', 'kuryer'],
  amount:              ['цена заказа', 'сумма заказа', 'сумма', 'order amount', 'amount'],
  deliveryPrice:       ['цена доставки', 'стоимость доставки', 'delivery price'],
  createdAt:           ['новый заказ', 'дата заказа', 'дата', 'date', 'created', 'время заказа'],
  deliveryTimeSeconds: ['итоговое время', 'время доставки', 'время', 'duration', 'time'],
};

// Faylsiz import bo'lmaydigan majburiy maydonlar
const REQUIRED_FIELDS = ['id', 'amount'];

const normalizeHeader = (h: any): string =>
  String(h ?? '')
    .toLowerCase()
    .replace(/^﻿/, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Sarlavha qatoridan har bir maydon uchun ustun indeksini topadi.
const resolveColumns = (headerRow: any[]): { index: Record<string, number>; missing: string[] } => {
  const normHeaders = headerRow.map(normalizeHeader);
  const index: Record<string, number> = {};

  for (const field of Object.keys(COLUMN_ALIASES)) {
    const aliases = COLUMN_ALIASES[field].map(normalizeHeader);
    // 1) Aniq moslik
    let found = normHeaders.findIndex(h => h && aliases.includes(h));
    // 2) Qisman moslik (sarlavha alias'ni o'z ichiga oladi yoki aksincha)
    if (found === -1) {
      found = normHeaders.findIndex(h => h && aliases.some(a => h.includes(a) || a.includes(h)));
    }
    index[field] = found;
  }

  const missing = REQUIRED_FIELDS.filter(f => index[f] === -1);
  return { index, missing };
};

const defaultFilters = {
  dateStart: '',
  dateEnd: '',
  type: 'all',
  branch: 'all',
  priceMin: '',
  priceMax: '',
};

const MasterDataView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [search, setSearch] = useState('');
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', duration?: number } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => { loadOrders(); }, []);

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

  // Katta importlarni bo'lib-bo'lib yuboradi (50MB limit / timeout / progress uchun).
  // frontendSkipped — serverga yuborilmasdan, faylni o'qishda o'tkazib yuborilgan
  // qatorlar (bo'sh ID / noto'g'ri narx) — yakuniy hisobotda ham ko'rsatamiz.
  const submitOrdersInChunks = async (allOrders: any[], frontendSkipped: string[] = []) => {
    const CHUNK = 1000;
    let totalAdded = 0;
    let newUsers = 0;
    let skippedExisting = 0; // bazada allaqachon bor
    let dupInFile = 0;       // fayl ichida ID takror
    let invalid = 0;         // chegaradan oshgan / yaroqsiz
    let failed = 0;          // yozishda xato
    const preSkipped = frontendSkipped.length; // faylni o'qishda o'tkazilgan
    const sampleSkipped: string[] = [];
    const sampleProblems: { id: string; reason: string }[] = [];

    for (let i = 0; i < allOrders.length; i += CHUNK) {
      const chunk = allOrders.slice(i, i + CHUNK);
      const sentSoFar = Math.min(i + CHUNK, allOrders.length);
      setToast({ message: `Import: ${sentSoFar}/${allOrders.length} qator yuborilmoqda...`, type: 'info' });
      const response = await api.importOrders(chunk);
      totalAdded += response.added || 0;
      newUsers += response.newUsersCreated || 0;
      skippedExisting += response.skippedExistingCount || 0;
      dupInFile += response.duplicateInFileCount || 0;
      invalid += response.invalidCount || 0;
      failed += response.failedCount || 0;
      if (response.skippedExisting) sampleSkipped.push(...response.skippedExisting);
      if (response.invalidRows) sampleProblems.push(...response.invalidRows);
      if (response.failed) sampleProblems.push(...response.failed);
    }

    const lost = skippedExisting + dupInFile + invalid + failed + preSkipped;
    if (lost === 0) {
      // Muvaffaqiyatli natija 6 soniya ko'rinib turadi (o'tkazib yuborilmasin)
      setToast({
        message: `Import yakunlandi! Qo'shildi: ${totalAdded}${newUsers ? `, yangi xodim: ${newUsers}` : ''}`,
        type: 'success',
        duration: 6000
      });
    } else {
      // Nimaga tushib qolganini ham UI'da, ham konsolda ko'rsatamiz (F12 → Console)
      const parts: string[] = [`Qo'shildi: ${totalAdded}`];
      if (skippedExisting) parts.push(`bazada bor: ${skippedExisting}`);
      if (dupInFile) parts.push(`fayl ichi dublikat: ${dupInFile}`);
      if (invalid) parts.push(`yaroqsiz: ${invalid}`);
      if (failed) parts.push(`xato: ${failed}`);
      if (preSkipped) parts.push(`o'qishda o'tkazilgan: ${preSkipped}`);
      const ids = sampleSkipped.slice(0, 5).join(', ');
      // Tushib qolganlar bo'lsa — o'qib ulgurish uchun qo'lda yopilguncha turadi
      setToast({
        message: `${parts.join(' · ')}${ids ? ` | masalan ID: ${ids}…` : ''}`,
        type: 'info',
        duration: 0
      });
      console.warn('📋 Import — tushib qolgan qatorlar:', {
        bazadaBor: sampleSkipped,
        yaroqsizYokiXato: sampleProblems,
        oqishdaOtkazilgan: frontendSkipped,
      });
    }
    loadOrders();
  };

  const processExcel = async (file: File) => {
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length < 2) {
        setToast({ message: "Fayl bo'sh yoki noto'g'ri formatda!", type: 'error', duration: 6000 });
        return;
      }

      const headerRow = rows[0] as any[];
      const { index, missing } = resolveColumns(headerRow);
      if (missing.length > 0) {
        setToast({ message: `Excel'da kerakli ustun(lar) topilmadi: ${missing.join(', ')}`, type: 'error', duration: 6000 });
        return;
      }

      const get = (cols: any[], field: string): string => {
        const i = index[field];
        return i >= 0 ? String(cols[i] ?? '').trim() : '';
      };

      const newOrders: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i] as any[];
        if (!cols || cols.every(c => !String(c ?? '').trim())) continue;

        const id = get(cols, 'id');
        if (!id) {
          errors.push(`${i + 1}-qator: ID bo'sh`);
          continue;
        }
        const amountStr = get(cols, 'amount').replace(/\s/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          errors.push(`${i + 1}-qator: narx noto'g'ri ("${get(cols, 'amount')}")`);
          continue;
        }
        const deliveryPriceStr = get(cols, 'deliveryPrice').replace(/\s/g, '').replace(',', '.');
        newOrders.push({
          id: String(id),
          operatorName: get(cols, 'operatorName'),
          branch: get(cols, 'branch'),
          deliveryType: get(cols, 'deliveryType'),
          courierName: get(cols, 'courierName'),
          amount,
          deliveryPrice: parseFloat(deliveryPriceStr) || 0,
          createdAt: get(cols, 'createdAt'),
          deliveryTimeSeconds: parseTimeToSeconds(get(cols, 'deliveryTimeSeconds'))
        });
      }

      if (newOrders.length === 0) {
        setToast({ message: "Faylda yaroqli ma'lumot topilmadi.", type: 'error', duration: 6000 });
        return;
      }
      // O'qishda o'tkazib yuborilgan qatorlar (bo'sh ID / noto'g'ri narx) ham
      // yakuniy hisobotda ko'rinadi — jimgina yo'qolmaydi
      await submitOrdersInChunks(newOrders, errors);
    } catch (error) {
      console.error("Excel import xatosi:", error);
      setToast({ message: "Excel faylni o'qishda xatolik yuz berdi.", type: 'error', duration: 6000 });
    } finally {
      setIsParsing(false);
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
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

  const setFilter = (key: keyof typeof defaultFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearch('');
  };

  const uniqueBranches = useMemo(() => {
    const branches = new Set(orders.map(o => o.branch).filter(Boolean));
    return ['all', ...Array.from(branches)] as string[];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (search) {
        const q = search.toLowerCase();
        const matches = o.id.toLowerCase().includes(q) ||
          (o.operator?.fullName || '').toLowerCase().includes(q) ||
          (o.courier?.fullName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      const orderDate = new Date(o.createdAt);
      if (filters.dateStart && orderDate < new Date(filters.dateStart)) return false;
      if (filters.dateEnd && orderDate > new Date(new Date(filters.dateEnd).setHours(23, 59, 59))) return false;
      if (filters.type !== 'all' && o.deliveryType !== filters.type) return false;
      if (filters.branch !== 'all' && o.branch !== filters.branch) return false;
      if (filters.priceMin && o.amount < Number(filters.priceMin)) return false;
      if (filters.priceMax && o.amount > Number(filters.priceMax)) return false;
      return true;
    });
  }, [orders, search, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (filters.dateStart || filters.dateEnd) count++;
    if (filters.type !== 'all') count++;
    if (filters.branch !== 'all') count++;
    if (filters.priceMin || filters.priceMax) count++;
    return count;
  }, [search, filters]);

  const typeOptions = [
    { value: 'all', label: 'Barcha turlar' },
    { value: 'Доставка', label: 'Доставка', icon: '🛵' },
    { value: 'Самовывоз', label: 'Самовывоз', icon: '🏃' },
  ];

  const branchOptions = uniqueBranches.map(b => ({ value: b, label: b === 'all' ? 'Barcha filiallar' : b }));


  return (
    <div className="space-y-5 animate-fadeIn pb-20 relative">
      {toast && <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <header className="card p-5">
        <div className="flex flex-col xl:flex-row xl:items-center gap-5">
          {/* Title + Search */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="shrink-0">
              <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Master Baza</h2>
              <p className="text-secondary font-medium mt-0.5 text-xs uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                {filteredOrders.length.toLocaleString()} / {orders.length.toLocaleString()} buyurtma
              </p>
            </div>

            {/* Always-visible search */}
            <div className="relative flex-1 min-w-0 max-w-md">
              <input
                type="text"
                placeholder="ID, Operator, Kuryer bo'yicha qidirish..."
                className="input pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="absolute left-3.5 top-3.5 text-secondary/60" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-3 p-0.5 text-secondary/60 hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtr toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-secondary border-border hover:border-gray-300 hover:text-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filtr
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 bg-accent text-primary text-[9px] font-black rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                Tozalash
              </button>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-secondary bg-white border border-border hover:border-gray-300 hover:text-primary transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              Yo'riqnoma
            </button>

            <input
              type="file" accept=".xlsx,.xls" className="hidden" ref={excelFileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return;
                processExcel(file);
              }}
            />
            <button
              onClick={() => excelFileInputRef.current?.click()}
              disabled={isParsing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              {isParsing ? 'Yuklanmoqda...' : 'Excel Yuklash'}
            </button>

            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Tozalash
            </button>
          </div>
        </div>
      </header>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="card animate-fadeIn">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

            {/* Sana boshlanish */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Dan</label>
              <input
                type="date"
                className="input text-sm"
                value={filters.dateStart}
                onChange={(e) => setFilter('dateStart', e.target.value)}
              />
            </div>

            {/* Sana tugash */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Gacha</label>
              <input
                type="date"
                className="input text-sm"
                value={filters.dateEnd}
                onChange={(e) => setFilter('dateEnd', e.target.value)}
              />
            </div>

            {/* Yetkazish turi */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Yetkazish turi</label>
              <select
                className="input text-sm"
                value={filters.type}
                onChange={(e) => setFilter('type', e.target.value)}
              >
                {typeOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Filial */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Filial</label>
              <select
                className="input text-sm"
                value={filters.branch}
                onChange={(e) => setFilter('branch', e.target.value)}
              >
                {branchOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Narx min */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Narx dan</label>
              <input
                type="number"
                placeholder="0"
                className="input text-sm"
                value={filters.priceMin}
                onChange={(e) => setFilter('priceMin', e.target.value)}
              />
            </div>

            {/* Narx max */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-secondary">Narx gacha</label>
              <input
                type="number"
                placeholder="∞"
                className="input text-sm"
                value={filters.priceMax}
                onChange={(e) => setFilter('priceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Active chips */}
          {activeFilterCount > 0 && (
            <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-border pt-3">
              {search && <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />}
              {(filters.dateStart || filters.dateEnd) && (
                <FilterChip
                  label={`${filters.dateStart || '...'} → ${filters.dateEnd || '...'}`}
                  onRemove={() => setFilters(f => ({ ...f, dateStart: '', dateEnd: '' }))}
                />
              )}
              {filters.type !== 'all' && (
                <FilterChip label={filters.type} onRemove={() => setFilter('type', 'all')} />
              )}
              {filters.branch !== 'all' && (
                <FilterChip label={filters.branch} onRemove={() => setFilter('branch', 'all')} />
              )}
              {(filters.priceMin || filters.priceMax) && (
                <FilterChip
                  label={`${filters.priceMin || '0'} — ${filters.priceMax || '∞'} so'm`}
                  onRemove={() => setFilters(f => ({ ...f, priceMin: '', priceMax: '' }))}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-2xl rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Excel Yuklash Tartibi</h3>
              <button onClick={() => setShowHelp(false)} className="p-2 bg-background rounded-xl hover:bg-secondary/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-6 text-sm text-secondary font-medium">
              <p>Tizimga ma'lumotlarni yuklash uchun <b>.xlsx</b> (Excel) formatidagi fayldan foydalaning. Faylning birinchi qatori (sarlavha) quyidagi ustun nomlarini o'z ichiga olishi <b>SHART</b> (ustun tartibi muhim emas):</p>
              <div className="bg-background p-4 rounded-2xl font-mono text-xs break-all border border-secondary/10 text-primary">{EXPECTED_HEADER}</div>
              <div>
                <h4 className="font-bold text-primary mb-2 uppercase tracking-widest text-xs">Ustunlar tavsifi:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><b>№</b>: Tartib raqami (ixtiyoriy)</li>
                  <li><b>Ид.заказа</b>: Buyurtma ID raqami (unikal)</li>
                  <li><b>Оператор</b>: Operatorning to'liq ismi</li>
                  <li><b>Название филиала</b>: Filial nomi</li>
                  <li><b>Тип доставки</b>: "Доставка" yoki "Самовывоз"</li>
                  <li><b>Курьер</b>: Kuryerning to'liq ismi (agar bo'lsa)</li>
                  <li><b>Источник</b>: Buyurtma manbasi</li>
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
                  <li>Fayl <b>.xlsx</b> yoki <b>.xls</b> formatida bo'lishi kerak.</li>
                  <li>Sana formati <b>2024-03-21 14:30:00</b> kabi bo'lishi kerak.</li>
                  <li>Narx ustunlarida so'm belgisi bo'lmasligi kerak (faqat raqam).</li>
                  <li>Bir xil <b>Ид.заказа</b> takror kelsa yoki bazada bor bo'lsa — qayta qo'shilmaydi (hisobotda ko'rsatiladi).</li>
                  <li>Tizimda topilmagan xodimlar avtomatik yaratiladi (parol: 123456).</li>
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

      {/* TABLE */}
      <div className="card overflow-hidden">
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
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                    <p className="font-bold text-sm">Ma'lumot topilmadi</p>
                    {activeFilterCount > 0 && (
                      <button onClick={resetFilters} className="text-xs font-black text-accent hover:underline">
                        Filtrlarni tozalash
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-gray-100 text-primary text-xs font-medium rounded-lg border border-border">
    {label}
    <button
      onClick={onRemove}
      className="w-4 h-4 rounded flex items-center justify-center text-secondary hover:text-rose-500 hover:bg-rose-50 transition-colors ml-0.5"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
      </svg>
    </button>
  </span>
);

export default MasterDataView;
