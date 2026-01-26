import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kelajakda bu yerda api.getDashboardStats() chaqiriladi
    // Hozircha bo'sh ma'lumot
    setTimeout(() => {
      setStats({
        orders: [],
        kpi: []
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-400 font-bold">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Asosiy Dashboard</h2>
          <p className="text-slate-500">Bugungi umumiy natijalar va statistikalar</p>
        </div>
        <div className="flex space-x-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">LIVE</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Jami buyurtmalar', value: '0', change: '0%', color: 'blue' },
          { label: 'O\'rtacha KPI', value: '0%', change: '0%', color: 'emerald' },
          { label: 'Faol kuryerlar', value: '0', change: 'Stable', color: 'amber' },
          { label: 'Bonuslar (Jami)', value: '0', change: '0%', color: 'violet' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-slate-300">
        <p className="text-slate-400 font-bold">Grafiklar ma'lumotlar bazasi to'ldirilgandan so'ng paydo bo'ladi.</p>
      </div>
    </div>
  );
};

export default Dashboard;
