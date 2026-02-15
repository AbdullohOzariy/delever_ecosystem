import React, { useState, useEffect } from 'react';
import { api } from '../api';

const RatingView: React.FC = () => {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const data = await api.getAllRatings();
      setRatings(data);
    } catch (error) {
      console.error("Reytinglarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 dark:text-slate-500 font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Reytinglar</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
          Barcha baholashlar tarixi
        </p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-b-2 border-slate-900 dark:border-slate-700">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Kimdan</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Kimga</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Baho</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Izoh</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {ratings.map((rating) => (
              <tr key={rating.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {rating.fromUser ? rating.fromUser.fullName : 'Noma\'lum'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {rating.fromUser ? rating.fromUser.role : '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {rating.toUser ? rating.toUser.fullName : 'Noma\'lum'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {rating.toUser ? rating.toUser.role : '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-3 py-1 rounded-lg font-black text-xs border-2 ${
                    rating.score >= 4 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                      : rating.score === 3 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  }`}>
                    {rating.score} ★
                  </span>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xs truncate">
                  {rating.comment || '-'}
                </td>
                <td className="px-8 py-5 text-right text-xs font-bold text-slate-400 dark:text-slate-500">
                  {new Date(rating.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {ratings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 dark:text-slate-600 font-bold">
                  Hali hech kim baholanmagan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RatingView;
