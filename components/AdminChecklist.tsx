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

  if (loading) return <div className="p-10 text-center text-slate-400 dark:text-slate-500 font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Vazifalar</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
          Bajarilishi kerak bo'lgan ishlar
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col justify-between group hover:translate-y-[-2px] transition-all">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 ${
                  task.type === 'DAILY' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                    : task.type === 'WEEKLY' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                }`}>
                  {task.type === 'DAILY' ? 'Kunlik' : task.type === 'WEEKLY' ? 'Haftalik' : 'Yuklash'}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{task.date}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-tight">{task.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {task.type === 'DAILY' ? "Operatorlarning KPI ballarini kiriting." : 
                 task.type === 'WEEKLY' ? "Kuryerlarning haftalik hisobotini tasdiqlang." : 
                 "Yangi buyurtmalar CSV faylini yuklang."}
              </p>
            </div>
            
            <button 
              onClick={() => setActiveTab(task.action)}
              className="w-full mt-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 dark:border-white"
            >
              Bajarish
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200 dark:border-emerald-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600 dark:text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Hammasi joyida!</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Hozircha bajariladigan vazifalar yo'q.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChecklist;
