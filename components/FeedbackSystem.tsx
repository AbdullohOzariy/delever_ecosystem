import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface FeedbackSystemProps {
  user: User;
}

const FeedbackSystem: React.FC<FeedbackSystemProps> = ({ user }) => {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, { score: number, comment: string }>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      // Serverdan operatorlarni olish (api.ts da getOperators funksiyasini qo'shish kerak yoki fetch)
      const res = await fetch('http://localhost:3001/api/operators');
      const data = await res.json();
      setOperators(data);
    } catch (error) {
      console.error("Operatorlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (operatorId: string, score: number) => {
    setRatings(prev => ({
      ...prev,
      [operatorId]: { ...prev[operatorId], score }
    }));
  };

  const handleCommentChange = (operatorId: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [operatorId]: { ...prev[operatorId], comment }
    }));
  };

  const submitRating = async (operatorId: string) => {
    const rating = ratings[operatorId];
    if (!rating || !rating.score) {
      setToast({ message: "Iltimos, baho qo'ying", type: 'error' });
      return;
    }

    try {
      // Serverga yuborish (api.ts da saveRating funksiyasini qo'shish kerak yoki fetch)
      await fetch('http://localhost:3001/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: operatorId,
          score: rating.score,
          comment: rating.comment
        })
      });
      
      setToast({ message: "Baho saqlandi!", type: 'success' });
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Operatorlar yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Operatorlarni Baholash</h2>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
          Bugungi smena bo'yicha fikringiz
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {operators.map(op => (
          <div key={op.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-xl">
                {op.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{op.fullName}</h4>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Operator</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingChange(op.id, star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      (ratings[op.id]?.score || 0) >= star ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 resize-none h-20"
                placeholder="Izoh qoldiring (ixtiyoriy)..."
                value={ratings[op.id]?.comment || ''}
                onChange={(e) => handleCommentChange(op.id, e.target.value)}
              />

              <button 
                onClick={() => submitRating(op.id)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
              >
                Baholash
              </button>
            </div>
          </div>
        ))}
        
        {operators.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">
            Operatorlar topilmadi.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackSystem;
