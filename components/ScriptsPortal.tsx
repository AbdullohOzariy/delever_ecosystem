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
  const [selectedScript, setSelectedScript] = useState<any | null>(null); // Modal uchun
  const [isEditing, setIsEditing] = useState(false); // Tahrirlash rejimi
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
      
      if (selectedScript && isEditing) {
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: "Nusxalandi!", type: 'success' });
  };

  const filteredScripts = scripts.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                          s.content.toLowerCase().includes(search.toLowerCase()) ||
                          s.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(scripts.map(s => s.category).filter(Boolean)))];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Skriptlar</h2>
          <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
            Mijozlar bilan muloqot standartlari
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="w-full bg-background border-none rounded-2xl px-5 py-3 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary placeholder-secondary/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <svg className="absolute left-4 top-3.5 text-secondary" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
          </div>
          
          {user.role === UserRole.ADMIN && (
            <button 
              onClick={openCreate}
              className="bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Yangi
            </button>
          )}
        </div>
      </header>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat as string)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              selectedCategory === cat 
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                : 'bg-surface text-secondary border-white/50 hover:bg-background'
            }`}
          >
            {cat === 'all' ? 'Barchasi' : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-20 text-center text-secondary font-bold">Yuklanmoqda...</div>
      ) : filteredScripts.length === 0 ? (
        <div className="p-20 text-center">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 border border-secondary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <h3 className="text-2xl font-black text-primary">Topilmadi</h3>
          <p className="text-secondary mt-2 font-medium">Qidiruv shartlariga mos skriptlar yo'q.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map(script => (
            <div 
              key={script.id}
              onClick={() => { setSelectedScript(script); setIsEditing(false); }}
              className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50 group hover:shadow-hover transition-all duration-300 cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-black text-primary leading-tight group-hover:text-accent transition-colors line-clamp-2">
                  {script.title}
                </h3>
                {script.category && (
                  <span className="bg-background text-secondary px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-secondary/10 shrink-0 ml-2">
                    {script.category}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-secondary font-medium line-clamp-4 mb-6 flex-1 leading-relaxed">
                {script.content}
              </p>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-secondary/5">
                <div className="flex gap-2 overflow-hidden">
                  {script.tags && script.tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-bold text-accent uppercase tracking-widest">
                      #{tag}
                    </span>
                  ))}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCopy(script.content); }}
                  className="p-2 rounded-xl bg-background text-secondary hover:bg-accent hover:text-primary transition-colors"
                  title="Nusxalash"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL (View / Edit / Create) */}
      {(selectedScript || isEditing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-2xl rounded-4xl p-8 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-black text-primary uppercase tracking-tight">
                {isEditing ? (selectedScript ? 'Tahrirlash' : 'Yangi Skript') : selectedScript?.title}
              </h3>
              <div className="flex gap-2">
                {!isEditing && user.role === UserRole.ADMIN && (
                  <>
                    <button onClick={() => openEdit(selectedScript)} className="p-2 bg-background rounded-xl text-secondary hover:text-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(selectedScript.id)} className="p-2 bg-rose-50 rounded-xl text-rose-500 hover:bg-rose-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </>
                )}
                <button onClick={() => { setSelectedScript(null); setIsEditing(false); }} className="p-2 bg-background rounded-xl text-secondary hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {isEditing ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                <input 
                  type="text" 
                  placeholder="Sarlavha" 
                  className="w-full bg-background border-none rounded-2xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Kategoriya" 
                    className="flex-1 bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <input 
                    type="text" 
                    placeholder="Teglar (vergul bilan)" 
                    className="flex-1 bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
                <textarea 
                  placeholder="Skript matni..." 
                  className="w-full bg-background border-none rounded-2xl p-4 text-base font-medium outline-none focus:ring-2 focus:ring-accent/50 text-primary resize-none h-64"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
                <button 
                  onClick={handleSave}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg active:scale-95"
                >
                  Saqlash
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="flex gap-2 mb-6">
                  {selectedScript.category && (
                    <span className="bg-accent/20 text-primary px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-accent/30">
                      {selectedScript.category}
                    </span>
                  )}
                  {selectedScript.tags && selectedScript.tags.map((tag: string) => (
                    <span key={tag} className="bg-background text-secondary px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-secondary/10">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg text-primary leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedScript.content}
                  </p>
                </div>
                <button 
                  onClick={() => handleCopy(selectedScript.content)}
                  className="w-full mt-8 py-4 bg-background text-primary rounded-2xl font-black uppercase tracking-widest hover:bg-accent transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  Nusxalash
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptsPortal;
