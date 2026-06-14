import React, { useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  // ms — qancha vaqt ko'rinib turishi. 0 yoki manfiy bo'lsa avtomatik yopilmaydi
  // (foydalanuvchi o'zi yopadi). Default: 3000.
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  // onClose har renderda yangi funksiya bo'lib timer'ni tiklab yubormasligi uchun ref'da saqlaymiz
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (duration <= 0) return; // doimiy — qo'lda yopiladi
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  const bgColors = {
    success: 'bg-slate-900 text-white shadow-emerald-500/20',
    error: 'bg-rose-500 text-white shadow-rose-500/20',
    info: 'bg-blue-500 text-white shadow-blue-500/20'
  };

  const icons = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    )
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${bgColors[type]}`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div>
        <p className="font-black text-sm tracking-wide uppercase opacity-90">{type === 'success' ? 'Muvaffaqiyatli' : type === 'error' ? 'Xatolik' : 'Ma\'lumot'}</p>
        <p className="text-sm font-medium mt-0.5 opacity-90">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
};

export default Toast;
