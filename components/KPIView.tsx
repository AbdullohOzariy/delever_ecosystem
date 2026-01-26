import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../api';

interface KPIViewProps {
  user: User;
}

// Normativlar (Ma'lumot uchun)
const KPI_NORMATIVES = {
  script: {
    title: "Skript va Muomala (30%)",
    rules: [
      { range: "4.8 - 5.0", score: 5, desc: "A'lo muomala, standartga to'liq rioya" },
      { range: "4.5 - 4.79", score: 4, desc: "Yaxshi, kichik kamchiliklar" },
      { range: "4.2 - 4.49", score: 3, desc: "O'rta, standartdan chetlanish" },
      { range: "4.0 - 4.19", score: 2, desc: "Qoniqarsiz" },
      { range: "< 4.0", score: 1, desc: "Juda yomon" }
    ]
  },
  errors: {
    title: "Xatoliklar (20%)",
    rules: [
      { range: "0 ta", score: 5, desc: "Ideal (Kunlik o'rtacha)" },
      { range: "1 ta", score: 4, desc: "Yaxshi" },
      { range: "2 ta", score: 3, desc: "O'rta" },
      { range: "3 ta", score: 2, desc: "Qoniqarsiz" },
      { range: "> 3 ta", score: 1, desc: "Xavfli" }
    ]
  },
  discipline: {
    title: "Intizom (15%)",
    rules: [
      { range: "0 ta", score: 5, desc: "Qoidabuzarlik yo'q" },
      { range: "1-2 ta", score: 4, desc: "Kichik ogohlantirish" },
      { range: "3 ta", score: 3, desc: "O'rta" },
      { range: "4-5 ta", score: 2, desc: "Jiddiy buzilish" },
      { range: "> 5 ta", score: 1, desc: "O'ta jiddiy" }
    ]
  },
  orders: {
    title: "Buyurtma Soni (12.5%)",
    rules: [
      { range: "> 2000", score: 5, desc: "Top natija" },
      { range: "1900 - 1999", score: 4, desc: "Yaxshi" },
      { range: "1700 - 1899", score: 3, desc: "O'rta" },
      { range: "1500 - 1699", score: 2, desc: "Past" },
      { range: "< 1500", score: 1, desc: "Juda past" }
    ]
  },
  speed: {
    title: "Tezlik (12.5%)",
    rules: [
      { range: "< 35 min", score: 5, desc: "Juda tez" },
      { range: "36 - 40 min", score: 4, desc: "Tez" },
      { range: "41 - 45 min", score: 3, desc: "Normal" },
      { range: "46 - 55 min", score: 2, desc: "Sekin" },
      { range: "> 55 min", score: 1, desc: "Juda sekin" }
    ]
  },
  check: {
    title: "O'rtacha Chek (10%)",
    rules: [
      { range: "> 110,000", score: 5, desc: "Zo'r upsell" },
      { range: "105k - 109k", score: 4, desc: "Yaxshi" },
      { range: "100k - 104k", score: 3, desc: "O'rta" },
      { range: "95k - 99k", score: 2, desc: "Past" },
      { range: "< 95,000", score: 1, desc: "Harakat qilish kerak" }
    ]
  }
};

const KPIView: React.FC<KPIViewProps> = ({ user }) => {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Modal State
  const [activeInfo, setActiveInfo] = useState<keyof typeof KPI_NORMATIVES | null>(null);

  useEffect(() => {
    loadData();
  }, [user.id, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [repData, histData] = await Promise.all([
        api.getKPIReport(user.id, month),
        api.getKPIHistory(user.id, month)
      ]);
      setReport(repData);
      setHistory(histData);
    } catch (error) {
      console.error("KPI yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400">Hisoblanmoqda...</div>;

  if (!report || !report.scores) {
    return (
      <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
        <h2 className="text-3xl font-black text-slate-900">KPI Hisoboti</h2>
        <p className="text-slate-500 mt-4">Ushbu oy uchun ma'lumot yetarli emas.</p>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-6 border border-slate-200 rounded-xl px-4 py-2 font-bold"
        />
      </div>
    );
  }

  const { facts, scores, finalScore } = report;

  const getStatus = (score: number) => {
    if (score >= 4.8) return { name: 'Top Ekspert', color: 'bg-purple-600', icon: '👑', bonus: '1,500,000' };
    if (score >= 4.5) return { name: 'A\'lochi', color: 'bg-emerald-500', icon: '🏆', bonus: '1,000,000' };
    if (score >= 4.0) return { name: 'Yaxshi', color: 'bg-blue-600', icon: '⭐', bonus: '500,000' };
    if (score >= 3.5) return { name: 'Standart', color: 'bg-amber-500', icon: '👌', bonus: '0' };
    return { name: 'Qoniqarsiz', color: 'bg-rose-500', icon: '⚠️', bonus: 'Jarima' };
  };

  const status = getStatus(Number(finalScore));
  const hasViolations = facts.totalViolations > 0;
  const hasErrors = scores.errors < 3;

  const metrics = [
    { id: 'script', label: 'Skript va Muomala', weight: '30%', fact: facts.avgScriptRaw, score: scores.script },
    { id: 'errors', label: 'Xatoliklar (Soni)', weight: '20%', fact: `${facts.avgErrorsPerDay} ta/kun`, score: scores.errors },
    { id: 'discipline', label: 'Intizom', weight: '15%', fact: `${facts.totalViolations} ta qoida buzish`, score: scores.discipline },
    { id: 'orders', label: 'Buyurtma Soni', weight: '12.5%', fact: facts.totalOrders, score: scores.orders },
    { id: 'speed', label: 'Tezlik', weight: '12.5%', fact: `${facts.avgSpeedMinutes} min`, score: scores.speed },
    { id: 'check', label: 'O\'rtacha Chek', weight: '10%', fact: `${facts.avgCheck.toLocaleString()} UZS`, score: scores.check },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-6 duration-700 relative">

      {/* INFO MODAL */}
      {activeInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setActiveInfo(null)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">{KPI_NORMATIVES[activeInfo].title}</h3>
              <button onClick={() => setActiveInfo(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              {KPI_NORMATIVES[activeInfo].rules.map((rule, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-700">{rule.range}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium text-right">{rule.desc}</span>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-white text-sm ${
                      rule.score >= 4 ? 'bg-emerald-500' : rule.score >= 3 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}>
                      {rule.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OGOHLANTIRISHLAR */}
      {(hasViolations || hasErrors) && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-xl shadow-sm flex items-start gap-4">
          <div className="text-2xl">🚨</div>
          <div>
            <h4 className="font-black text-rose-700 text-lg">Diqqat! Sizda qoidabuzarliklar bor</h4>
            <ul className="list-disc list-inside text-rose-600 mt-2 text-sm font-medium">
              {hasViolations && <li>Intizom bo'yicha {facts.totalViolations} ta qoidabuzarlik qayd etilgan.</li>}
              {hasErrors && <li>Xatoliklar soni normadan yuqori. Iltimos, diqqatliroq bo'ling.</li>}
            </ul>
          </div>
        </div>
      )}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Mening KPI</h2>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none"
            />
            <p className="text-slate-500 font-medium uppercase text-xs tracking-[0.2em]">bo'yicha hisobot</p>
          </div>
        </div>
        <div className={`${status.color} text-white p-2 rounded-[2rem] flex items-center shadow-xl shadow-blue-500/10`}>
          <div className="bg-white/20 p-4 rounded-2xl text-3xl mr-4">{status.icon}</div>
          <div className="pr-8 border-r border-white/20">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">Sizning Statusingiz</p>
            <p className="text-xl font-black">{status.name}</p>
          </div>
          <div className="pl-8 pr-4">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest text-center">Final Ball</p>
            <p className="text-4xl font-black">{finalScore}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* METRICS TABLE */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Ko'rsatkich</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Fakt</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Ball (1-5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {metrics.map((m, i) => (
                  <tr key={i} className="group hover:bg-slate-50/80 transition-all cursor-pointer" onClick={() => setActiveInfo(m.id as any)}>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900">{m.label}</p>
                        <span className="text-slate-400 hover:text-blue-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Og'irlik: {m.weight}</p>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-600">{m.fact}</td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black ${
                        m.score >= 4 ? 'bg-emerald-100 text-emerald-600' :
                        m.score >= 3 ? 'bg-blue-100 text-blue-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {m.score}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 border-t-4 border-slate-200">
                  <td colSpan={2} className="px-8 py-8 text-2xl font-black text-slate-900">Jami KPI Ball</td>
                  <td className="px-8 py-8 text-center text-4xl font-black text-blue-600 tracking-tighter">{finalScore}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* HISTORY TABLE */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h4 className="text-xl font-black text-slate-900 mb-6">Kunlik Baholash Tarixi</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Sana</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Skript</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Xato</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Intizom</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Izoh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-blue-600">{item.scriptScore}</td>
                      <td className="px-4 py-3 text-center font-black text-rose-500">{item.errorScore}</td>
                      <td className="px-4 py-3 text-center font-black text-amber-500">{item.disciplineScore}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 italic">{item.comment || '-'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-bold">Tarix topilmadi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Hisoblangan Bonus</p>
            <h3 className="text-4xl font-black text-white flex items-baseline gap-2">
              {status.bonus} <span className="text-xs font-normal opacity-50 uppercase tracking-widest">UZS</span>
            </h3>
            <div className="mt-8 flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/5">
              <span className="text-2xl">⚡</span>
              <p className="text-xs font-medium leading-relaxed opacity-80">
                {Number(finalScore) < 4.8
                  ? "Keyingi pog'onaga chiqish uchun ko'proq buyurtma oling va xatolarni kamaytiring."
                  : "Ajoyib natija! Shu tempda davom eting."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIView;
