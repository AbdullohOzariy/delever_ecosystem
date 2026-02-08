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
      // XAVFSIZLIK: Agar data massiv bo'lmasa, bo'sh massiv ishlatamiz
      if (Array.isArray(data)) {
        setScripts(data);
      } else {
        console.error("Skriptlar noto'g'ri formatda keldi:", data);
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
      <div className="w-1/3 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Skriptlar</h2>
            {user.role === UserRole.ADMIN && (
              <button 
                onClick={openCreate}
                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/20"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
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
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  selectedScript?.id === script.id 
                    ? 'bg-blue-50 border-blue-200 shadow-md' 
                    : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`font-bold text-sm ${selectedScript?.id === script.id ? 'text-blue-700' : 'text-slate-900'}`}>
                    {script.title}
                  </h4>
                  {script.category && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {script.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                  {script.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDE (CONTENT) */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col relative overflow-hidden">
        {isEditing ? (
          <div className="flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900">{selectedScript ? 'Tahrirlash' : 'Yangi Skript'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">Bekor qilish</button>
            </div>
            
            <input 
              type="text" 
              placeholder="Sarlavha" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-100"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Kategoriya (masalan: Sotuv)" 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <input 
                type="text" 
                placeholder="Teglar (vergul bilan)" 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <textarea 
              placeholder="Skript matni..." 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-base font-medium outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />

            <button 
              onClick={handleSave}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20"
            >
              Saqlash
            </button>
          </div>
        ) : selectedScript ? (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{selectedScript.title}</h2>
                <div className="flex gap-2">
                  {selectedScript.category && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {selectedScript.category}
                    </span>
                  )}
                  {selectedScript.tags && selectedScript.tags.map((tag: string) => (
                    <span key={tag} className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {user.role === UserRole.ADMIN && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEdit(selectedScript)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedScript.id)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedScript.content}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <p className="text-lg font-bold">Skriptni tanlang yoki yangisini yarating</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptsPortal;
