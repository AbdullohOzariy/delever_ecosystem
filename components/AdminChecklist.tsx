import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface AdminChecklistProps {
  setActiveTab: (tab: string) => void;
}

const AdminChecklist: React.FC<AdminChecklistProps> = ({ setActiveTab }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      const data = await api.getAdminChecklist();
      setTasks(data);
    } catch (error) {
      console.error("Checklist yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-secondary font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Vazifalar</h2>
        <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
          Bajarilishi kerak bo'lgan ishlar
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div key={task.id} className="bg-surface p-8 rounded-4xl shadow-soft border border-white/50 flex flex-col justify-between group hover:shadow-hover transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  task.type === 'DAILY' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : task.type === 'WEEKLY' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {task.type === 'DAILY' ? 'Kunlik' : task.type === 'WEEKLY' ? 'Haftalik' : 'Yuklash'}
                </span>
                <span className="text-xs font-bold text-secondary">{task.date}</span>
              </div>
              <h3 className="text-xl font-black text-primary mb-2 leading-tight">{task.title}</h3>
              <p className="text-xs text-secondary font-medium leading-relaxed">
                {task.type === 'DAILY' ? "Operatorlarning KPI ballarini kiriting." : 
                 task.type === 'WEEKLY' ? "Kuryerlarning haftalik hisobotini tasdiqlang." : 
                 "Yangi buyurtmalar CSV faylini yuklang."}
              </p>
            </div>
            
            <button 
              onClick={() => setActiveTab(task.action)}
              className="w-full mt-8 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              Bajarish
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 className="text-2xl font-black text-primary">Hammasi joyida!</h3>
            <p className="text-secondary mt-2 font-medium">Hozircha bajariladigan vazifalar yo'q.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChecklist;
