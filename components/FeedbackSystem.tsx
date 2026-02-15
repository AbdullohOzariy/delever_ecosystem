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
  
  // pendingWeeks endi obyektlar massivi bo'ladi: { label: '2026-W06', value: '2026-02-02' }
  const [pendingWeeks, setPendingWeeks] = useState<{ label: string, value: string }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(''); // Bu yerda 'value' (sana) turadi

  useEffect(() => {
    loadPendingFeedback();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadData();
    }
  }, [selectedWeek]);

  const getWeekLabel = (dateStr: string) => {
    if (dateStr.includes('-W')) return dateStr;
    const date = new Date(dateStr);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  };

  const loadPendingFeedback = async () => {
    try {
      const payments = await api.getPendingFeedback(user.id);
      const weeks = payments.map((p: any) => ({
        label: getWeekLabel(p.period),
        value: p.period
      }));
      
      // Unikal haftalarni olish (value bo'yicha)
      const uniqueWeeks = Array.from(new Map(weeks.map((item: any) => [item.value, item])).values());
      
      // @ts-ignore
      setPendingWeeks(uniqueWeeks);
      
      // Agar qarz bo'lsa, birinchisini avtomatik tanlash
      if (uniqueWeeks.length > 0 && !selectedWeek) {
        // @ts-ignore
        setSelectedWeek(uniqueWeeks[0].value);
      }
    } catch (error) {
      console.error("Kutilayotgan baholashlarni yuklashda xatolik");
    }
  };

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

      const existingRatings = await api.getRatingsForCourierAndWeek(user.id, selectedWeek);
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
        week: selectedWeek // Bu yerda sana ketadi (2026-02-02)
      });
      
      setToast({ message: "Baho saqlandi!", type: 'success' });
      loadPendingFeedback(); // Yangilash
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  const targetLabel = user.role === UserRole.COURIER ? "Operatorlar" : "Kuryerlar";

  if (pendingWeeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-soft">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h2 className="text-3xl font-black text-primary text-center">Hammasi joyida!</h2>
        <p className="text-secondary mt-2 text-center max-w-md font-medium">
          Sizda baholash uchun qarzdorlik yo'q. Barcha to'lovlar uchun baholashlar yakunlangan.
        </p>
      </div>
    );
  }

  if (loading && !selectedWeek) return <div className="p-10 text-center text-secondary font-bold">Yuklanmoqda...</div>;

  const ratedCount = Object.keys(ratings).length;
  const totalTargets = targets.length;
  const progress = totalTargets > 0 ? Math.round((ratedCount / totalTargets) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Notification Area */}
      {pendingWeeks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <div>
            <h4 className="font-bold text-amber-800 text-sm">Diqqat! Quyidagi haftalar uchun baholash qarz:</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingWeeks.map(w => (
                <button 
                  key={w.value}
                  onClick={() => setSelectedWeek(w.value)}
                  className={`px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors ${selectedWeek === w.value ? 'ring-2 ring-amber-500' : ''}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">{targetLabel}ni Baholash</h2>
          <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
            Haftalik maosh olish uchun barcha {targetLabel.toLowerCase()}ni baholang
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-background px-4 py-3 rounded-2xl text-sm font-bold text-primary shadow-inner">
            {pendingWeeks.find(w => w.value === selectedWeek)?.label || 'Hafta tanlanmagan'}
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-secondary uppercase tracking-widest">Holat</p>
            <p className={`text-lg font-black ${progress === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
              {ratedCount} / {totalTargets}
            </p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-background rounded-full h-3 mb-6 border border-secondary/10 overflow-hidden">
        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {targets.map(target => (
          <div key={target.id} className={`bg-surface p-6 rounded-4xl shadow-soft border transition-all group hover:shadow-hover duration-300 ${
            ratings[target.id]?.score 
              ? 'border-emerald-200' 
              : 'border-white/50'
          }`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                ratings[target.id]?.score 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-background text-primary border-secondary/10'
              }`}>
                {target.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-primary text-lg">{target.fullName}</h4>
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest">
                  {user.role === UserRole.COURIER ? 'Operator' : 'Kuryer'}
                </p>
              </div>
              {ratings[target.id]?.score && (
                <div className="ml-auto bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-center gap-2 bg-background p-3 rounded-2xl border border-secondary/5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingChange(target.id, star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      (ratings[target.id]?.score || 0) >= star ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full bg-background border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-accent/50 text-primary resize-none h-24 transition-all placeholder-secondary/50"
                placeholder="Izoh qoldiring (ixtiyoriy)..."
                value={ratings[target.id]?.comment || ''}
                onChange={(e) => handleCommentChange(target.id, e.target.value)}
              />

              <button 
                onClick={() => submitRating(target.id)}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  ratings[target.id]?.score 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                    : 'bg-primary text-white hover:bg-accent hover:text-primary shadow-primary/20'
                }`}
              >
                {ratings[target.id]?.score ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackSystem;
