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

  if (loading) return <div className="p-10 text-center text-secondary font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Reytinglar</h2>
        <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
          Barcha baholashlar tarixi
        </p>
      </header>

      <div className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-background text-secondary">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest rounded-l-2xl">Kimdan</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Kimga</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">Baho</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">Izoh</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right rounded-r-2xl">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background">
              {ratings.map((rating) => (
                <tr key={rating.id} className="hover:bg-background/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary text-sm">
                        {rating.fromUser ? rating.fromUser.fullName : 'Noma\'lum'}
                      </span>
                      <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                        {rating.fromUser ? rating.fromUser.role : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-bold text-primary text-sm">
                        {rating.toUser ? rating.toUser.fullName : 'Noma\'lum'}
                      </span>
                      <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                        {rating.toUser ? rating.toUser.role : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-xl font-black text-xs border ${
                      rating.score >= 4 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : rating.score === 3 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {rating.score} ★
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-secondary max-w-xs truncate">
                    {rating.comment || '-'}
                  </td>
                  <td className="px-8 py-5 text-right text-xs font-bold text-secondary">
                    {new Date(rating.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {ratings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-secondary font-bold">
                    Hali hech kim baholanmagan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RatingView;
