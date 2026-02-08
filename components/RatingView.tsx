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
      console.log("Reytinglar:", data); // DEBUG
      setRatings(data);
    } catch (error) {
      console.error("Reytinglarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reytinglar</h2>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
          Barcha baholashlar tarixi
        </p>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Kimdan</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Kimga</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Baho</th>
              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Izoh</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Sana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ratings.map((rating) => (
              <tr key={rating.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">
                      {rating.fromUser ? rating.fromUser.fullName : 'Noma\'lum'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {rating.fromUser ? rating.fromUser.role : '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">
                      {rating.toUser ? rating.toUser.fullName : 'Noma\'lum'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {rating.toUser ? rating.toUser.role : '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`px-3 py-1 rounded-lg font-black text-xs ${
                    rating.score >= 4 ? 'bg-emerald-100 text-emerald-700' :
                    rating.score === 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {rating.score} ★
                  </span>
                </td>
                <td className="px-6 py-5 text-sm font-medium text-slate-600 max-w-xs truncate">
                  {rating.comment || '-'}
                </td>
                <td className="px-8 py-5 text-right text-xs font-bold text-slate-400">
                  {new Date(rating.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {ratings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center text-slate-400 font-bold">
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
