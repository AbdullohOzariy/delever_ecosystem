import React, { useEffect, useState } from 'react';
import { api } from '../api';

interface Task {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY' | 'UPLOAD';
  status: 'PENDING' | 'DONE';
  date: string;
  action: string;
}

interface AdminChecklistProps {
  setActiveTab: (tab: string) => void;
}

const AdminChecklist: React.FC<AdminChecklistProps> = ({ setActiveTab }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getAdminChecklist();
      // Agar data massiv bo'lmasa, bo'sh massiv qilamiz
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Checklist yuklashda xatolik");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'DAILY': return '📝';
      case 'WEEKLY': return '💰';
      case 'UPLOAD': return '📂';
      default: return '📌';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'DAILY': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'WEEKLY': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'UPLOAD': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Vazifalar yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bugungi Vazifalar</h2>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
          Admin uchun kunlik nazorat ro'yxati
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {tasks.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-black text-slate-900">Hammasi joyida!</h3>
            <p className="text-slate-500 mt-2">Siz barcha vazifalarni bajardingiz.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className={`p-6 rounded-[2rem] border flex items-center justify-between group hover:shadow-md transition-all ${getColor(task.type)}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  {getIcon(task.type)}
                </div>
                <div>
                  <h4 className="font-black text-lg">{task.title}</h4>
                  <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{task.date}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setActiveTab(task.action)}
                className="bg-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                Bajarish
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminChecklist;
