import React, { useState, useEffect } from 'react';
import { api } from '../api';

interface AdminChecklistProps {
  setActiveTab: (tab: string) => void;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  DAILY:   { label: 'Kunlik',  color: 'text-blue-600',   bg: 'bg-blue-50',   desc: 'Operatorlarning KPI ballarini kiriting.' },
  WEEKLY:  { label: 'Haftalik',color: 'text-violet-600', bg: 'bg-violet-50', desc: 'Kuryerlarning haftalik hisobotini tasdiqlang.' },
  IMPORT:  { label: 'Yuklash', color: 'text-amber-600',  bg: 'bg-amber-50',  desc: 'Yangi buyurtmalar CSV faylini yuklang.' },
};

const AdminChecklist: React.FC<AdminChecklistProps> = ({ setActiveTab }) => {
  const [tasks, setTasks]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await api.getAdminChecklist();
      setTasks(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Vazifalar</h2>
          <p className="page-subtitle">Bugungi bajarilishi kerak bo'lgan ishlar</p>
        </div>
        <span className="badge bg-gray-100 text-secondary">
          {tasks.length} ta vazifa
        </span>
      </div>

      {/* Cards */}
      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
          {tasks.map((task) => {
            const cfg = typeConfig[task.type] ?? typeConfig['DAILY'];
            return (
              <div
                key={task.id}
                className="card card-hover p-6 flex flex-col gap-4"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <span className={`badge ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-secondary">{task.date}</span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-bold text-primary text-base mb-1 leading-snug">{task.title}</h3>
                  <p className="text-xs text-secondary leading-relaxed">{cfg.desc}</p>
                </div>

                {/* Action */}
                <button
                  onClick={() => setActiveTab(task.action)}
                  className="btn-primary w-full text-center justify-center flex"
                >
                  Bajarish →
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-500">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-primary text-lg">Hammasi joyida!</h3>
            <p className="text-sm text-secondary mt-1">Hozircha bajariladigan vazifalar yo'q.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChecklist;
