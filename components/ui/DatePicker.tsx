import React from 'react';

interface DatePickerProps {
  type?: 'date' | 'week' | 'month';
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ type = 'date', value, onChange, label, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>}
      
      <div className="relative group">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none transition-all focus:ring-4 focus:ring-blue-100 focus:border-blue-300 group-hover:border-blue-200 appearance-none cursor-pointer`}
        />
        
        {/* Custom Icon Overlay (Standart ikonkani yashirish qiyin, shuning uchun ustiga qo'yamiz yoki yoniga) */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
          {type === 'week' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
