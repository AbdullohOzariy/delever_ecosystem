import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface ScriptsPortalProps {
  user: User;
}

const ScriptsPortal: React.FC<ScriptsPortalProps> = ({ user }) => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScript, setSelectedScript] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [formData, setFormData] = useState({ title: '', content: '', category: '', tags: '' });

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const data = await api.getScripts();
      if (Array.isArray(data)) {
        setScripts(data);
      } else {
        setScripts([]);
      }
    } catch (error) {
      console.error("Skriptlarni yuklashda xatolik");
      setScripts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      setToast({ message: "Sarlavha va matn kiritilishi shart", type: 'error' });
      return;
    }

    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (selectedScript) {
        await api.updateScript(selectedScript.id, { ...formData, tags: tagsArray });
        setToast({ message: "Skript yangilandi", type: 'success' });
      } else {
        await api.createScript({ ...formData, tags: tagsArray });
        setToast({ message: "Skript yaratildi", type: 'success' });
      }
      
      setIsEditing(false);
      setSelectedScript(null);
      setFormData({ title: '', content: '', category: '', tags: '' });
      loadScripts();
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("O'chirmoqchimisiz?")) {
      try {
        await api.deleteScript(id);
        setToast({ message: "Skript o'chirildi", type: 'info' });
        loadScripts();
        if (selectedScript?.id === id) setSelectedScript(null);
      } catch (error) {
        setToast({ message: "Xatolik", type: 'error' });
      }
    }
  };

  const openEdit = (script: any) => {
    setSelectedScript(script);
    setFormData({
      title: script.title,
      content: script.content,
      category: script.category || '',
      tags: script.tags ? script.tags.join(', ') : ''
    });
    setIsEditing(true);
  };

  const openCreate = () => {
    setSelectedScript(null);
    setFormData({ title: '', content: '', category: '', tags: '' });
    setIsEditing(true);
  };

  const filteredScripts = scripts.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(scripts.map(s => s.category).filter(Boolean)))];

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-6 animate-in fade-in duration-500 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* LEFT SIDEBAR (LIST) */}
      <div className="w-1/3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b-2 border-slate-900 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Skriptlar</h2>
            {user.role === UserRole.ADMIN && (
              <button 
                onClick={openCreate}
                className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-blue-600 dark:hover:bg-slate-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Qidirish..." 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 pl-10 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white transition-all text-slate-900 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="absolute left-3 top-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as string)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-bold">Yuklanmoqda...</div>
          ) : filteredScripts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-bold">Skriptlar topilmadi.</div>
          ) : (
            filteredScripts.map(script => (
              <div 
                key={script.id}
                onClick={() => { setSelectedScript(script); setIsEditing(false); }}
                className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  selectedScript?.id === script.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-600 dark:border-blue-400 shadow-[2px_2px_0px_0px_rgba(37,99,235,0.2)]' 
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-sm ${selectedScript?.id === script.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                    {script.title}
                  </h4>
                  {script.category && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {script.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">
                  {script.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDE (CONTENT) */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] p-8 flex flex-col relative overflow-hidden transition-colors duration-300">
        {isEditing ? (
          <div className="flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedScript ? 'Tahrirlash' : 'Yangi Skript'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-sm">Bekor qilish</button>
            </div>
            
            <input 
              type="text" 
              placeholder="Sarlavha" 
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Kategoriya (masalan: Sotuv)" 
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <input 
                type="text" 
                placeholder="Teglar (vergul bilan)" 
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <textarea 
              placeholder="Skript matni..." 
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-medium outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white resize-none transition-all"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />

            <button 
              onClick={handleSave}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-slate-900 dark:border-white"
            >
              Saqlash
            </button>
          </div>
        ) : selectedScript ? (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{selectedScript.title}</h2>
                <div className="flex gap-2">
                  {selectedScript.category && (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800">
                      {selectedScript.category}
                    </span>
                  )}
                  {selectedScript.tags && selectedScript.tags.map((tag: string) => (
                    <span key={tag} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {user.role === UserRole.ADMIN && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEdit(selectedScript)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedScript.id)}
                    className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border-2 border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedScript.content}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <p className="text-lg font-bold">Skriptni tanlang yoki yangisini yarating</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptsPortal;
