import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface FeedbackSystemProps {
  user: User;
}

const FeedbackSystem: React.FC<FeedbackSystemProps> = ({ user }) => {
  const [targets, setTargets] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, { score: number, comment: string }>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const getCurrentWeek = () => {
    const date = new Date();
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };
  const [week, setWeek] = useState(getCurrentWeek());

  useEffect(() => {
    loadData();
  }, [week]);

  const loadData = async () => {
    setLoading(true);
    try {
      let data = [];
      if (user.role === UserRole.COURIER) {
        data = await api.getOperators();
      } else if (user.role === UserRole.OPERATOR) {
        data = await api.getCouriers();
      }
      setTargets(data);

      const existingRatings = await api.getRatingsForCourierAndWeek(user.id, week);
      const ratingsMap: Record<string, { score: number, comment: string }> = {};
      existingRatings.forEach((r: any) => {
        ratingsMap[r.toUserId] = { score: r.score, comment: r.comment || '' };
      });
      setRatings(ratingsMap);

    } catch (error) {
      console.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (targetId: string, score: number) => {
    setRatings(prev => ({
      ...prev,
      [targetId]: { ...prev[targetId], score }
    }));
  };

  const handleCommentChange = (targetId: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [targetId]: { ...prev[targetId], comment }
    }));
  };

  const submitRating = async (targetId: string) => {
    const rating = ratings[targetId];
    if (!rating || !rating.score) {
      setToast({ message: "Iltimos, baho qo'ying", type: 'error' });
      return;
    }

    try {
      await api.saveRating({
        fromUserId: user.id,
        toUserId: targetId,
        score: rating.score,
        comment: rating.comment,
        week: week
      });
      
      setToast({ message: "Baho saqlandi!", type: 'success' });
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 dark:text-slate-500 font-bold">Yuklanmoqda...</div>;

  const ratedCount = Object.keys(ratings).length;
  const totalTargets = targets.length;
  const progress = totalTargets > 0 ? Math.round((ratedCount / totalTargets) * 100) : 0;

  const targetLabel = user.role === UserRole.COURIER ? "Operatorlar" : "Kuryerlar";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{targetLabel}ni Baholash</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Haftalik maosh olish uchun barcha {targetLabel.toLowerCase()}ni baholang
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <input 
            type="week" 
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
          />
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Holat</p>
            <p className={`text-lg font-black ${progress === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {ratedCount} / {totalTargets}
            </p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-6 border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 dark:bg-white h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {targets.map(target => (
          <div key={target.id} className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 transition-all group ${
            ratings[target.id]?.score 
              ? 'border-emerald-500 dark:border-emerald-500 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)]' 
              : 'border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]'
          }`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 ${
                ratings[target.id]?.score 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-900 dark:border-slate-500'
              }`}>
                {target.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{target.fullName}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                  {user.role === UserRole.COURIER ? 'Operator' : 'Kuryer'}
                </p>
              </div>
              {ratings[target.id]?.score && (
                <div className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg border-2 border-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingChange(target.id, star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      (ratings[target.id]?.score || 0) >= star ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white resize-none h-20 transition-all"
                placeholder="Izoh qoldiring (ixtiyoriy)..."
                value={ratings[target.id]?.comment || ''}
                onChange={(e) => handleCommentChange(target.id, e.target.value)}
              />

              <button 
                onClick={() => submitRating(target.id)}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 ${
                  ratings[target.id]?.score 
                    ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600 shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]' 
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'
                } active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`}
              >
                {ratings[target.id]?.score ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
        ))}
        
        {targets.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 dark:text-slate-600 font-bold">
            {targetLabel} topilmadi.
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackSystem;
