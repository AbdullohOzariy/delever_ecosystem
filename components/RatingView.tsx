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
      // Hozircha api.ts da getRatings yo'q, uni qo'shish kerak yoki fetch
      const res = await fetch('http://localhost:3001/api/ratings/all');
      const data = await res.json();
      setRatings(data);
    } catch (error) {
      console.error("Reytinglarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Baholash Tarixi</h2>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
          Kuryerlar va Operatorlar o'rtasidagi fikr-mulohazalar
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ratings.map((rating) => (
          <div key={rating.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600">
                  {rating.fromUser.fullName.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{rating.fromUser.fullName}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">{rating.fromUser.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kimga:</p>
                <p className="text-xs font-bold text-slate-900">{rating.toUser.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`text-lg ${rating.score >= star ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
              ))}
            </div>

            <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
              "{rating.comment || 'Izoh yo\'q'}"
            </p>
            
            <p className="text-[10px] text-slate-400 font-bold text-right mt-4">
              {new Date(rating.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        
        {ratings.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">
            Hozircha baholar yo'q.
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingView;
