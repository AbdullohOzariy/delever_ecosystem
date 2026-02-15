import React, { useState, useEffect, useMemo } from 'react';
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
  const [selectedScript, setSelectedScript] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Form State (YANGI: Massiv)
  const [formItems, setFormItems] = useState([{ title: '', content: '' }]);
  const [formCategory, setFormCategory] = useState('');
  const [formTags, setFormTags] = useState('');

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const data = await api.getScripts();
      if (Array.isArray(data)) {
        setScripts(data);
        const cats = new Set(data.map(s => s.category || 'Umumiy'));
        setOpenCategories(cats);
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
    // Validatsiya
    const validItems = formItems.filter(item => item.title && item.content);
    if (validItems.length === 0) {
      setToast({ message: "Kamida bitta sarlavha va matn kiriting", type: 'error' });
      return;
    }

    try {
      const tagsArray = formTags.split(',').map(t => t.trim()).filter(Boolean);
      
      if (selectedScript && isEditing) {
        // Tahrirlash (faqat bitta)
        await api.updateScript(selectedScript.id, { 
          title: formItems[0].title, 
          content: formItems[0].content, 
          category: formCategory, 
          tags: tagsArray 
        });
        setToast({ message: "Skript yangilandi", type: 'success' });
      } else {
        // Yaratish (bir nechta bo'lishi mumkin)
        const newScripts = validItems.map(item => ({
          title: item.title,
          content: item.content,
          category: formCategory,
          tags: tagsArray
        }));

        if (newScripts.length === 1) {
          await api.createScript(newScripts[0]);
        } else {
          // Backend massiv qabul qiladigan qilib o'zgartirildi
          // @ts-ignore
          await api.createScript(newScripts); 
        }
        setToast({ message: `${newScripts.length} ta skript yaratildi`, type: 'success' });
      }
      
      setIsEditing(false);
      setSelectedScript(null);
      setFormItems([{ title: '', content: '' }]);
      setFormCategory('');
      setFormTags('');
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
    setFormItems([{ title: script.title, content: script.content }]);
    setFormCategory(script.category || '');
    setFormTags(script.tags ? script.tags.join(', ') : '');
    setIsEditing(true);
  };

  const openCreate = () => {
    setSelectedScript(null);
    setFormItems([{ title: '', content: '' }]);
    setFormCategory('');
    setFormTags('');
    setIsEditing(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: "Nusxalandi!", type: 'success' });
  };

  const toggleCategory = (category: string) => {
    const newOpen = new Set(openCategories);
    if (newOpen.has(category)) {
      newOpen.delete(category);
    } else {
      newOpen.add(category);
    }
    setOpenCategories(newOpen);
  };

  // Form Item qo'shish
  const addFormItem = () => {
    setFormItems([...formItems, { title: '', content: '' }]);
  };

  // Form Item o'chirish
  const removeFormItem = (index: number) => {
    const newItems = [...formItems];
    newItems.splice(index, 1);
    setFormItems(newItems);
  };

  // Form Item o'zgartirish
  const updateFormItem = (index: number, field: 'title' | 'content', value: string) => {
    const newItems = [...formItems];
    newItems[index][field] = value;
    setFormItems(newItems);
  };

  const groupedScripts = useMemo(() => {
    const groups: Record<string, any[]> = {};
    scripts.forEach(script => {
      const cat = script.category || 'Umumiy';
      if (!groups[cat]) groups[cat] = [];
      if (search) {
        const matches = script.title.toLowerCase().includes(search.toLowerCase()) || 
                        script.content.toLowerCase().includes(search.toLowerCase()) ||
                        script.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
        if (matches) groups[cat].push(script);
      } else {
        groups[cat].push(script);
      }
    });
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) delete groups[key];
    });
    return groups;
  }, [scripts, search]);

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

      {/* Content */}
      {loading ? (
        <div className="p-20 text-center text-secondary font-bold">Yuklanmoqda...</div>
      ) : Object.keys(groupedScripts).length === 0 ? (
        <div className="p-20 text-center">
          <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 border border-secondary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <h3 className="text-2xl font-black text-primary">Topilmadi</h3>
          <p className="text-secondary mt-2 font-medium">Qidiruv shartlariga mos skriptlar yo'q.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedScripts).map(([category, items]) => (
            <div key={category} className="bg-surface rounded-4xl shadow-soft border border-white/50 overflow-hidden">
              {/* Category Header */}
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex justify-between items-center p-6 bg-background/50 hover:bg-background transition-colors text-left"
              >
                <h3 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
                  <span className="w-2 h-8 bg-accent rounded-full"></span>
                  {category}
                  <span className="text-xs font-bold text-secondary bg-white px-2 py-1 rounded-lg border border-secondary/10">
                    {items.length}
                  </span>
                </h3>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className={`text-secondary transition-transform duration-300 ${openCategories.has(category) ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Scripts List */}
              {openCategories.has(category) && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                  {items.map((script: any) => (
                    <div 
                      key={script.id} 
                      className="bg-white p-6 rounded-3xl border border-secondary/10 hover:border-accent/50 hover:shadow-md transition-all group relative cursor-pointer"
                      onClick={() => { setSelectedScript(script); setIsEditing(false); }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-bold text-primary">{script.title}</h4>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleCopy(script.content); }}
                            className="p-1.5 bg-background rounded-lg text-secondary hover:text-primary hover:bg-accent/20 transition-colors"
                            title="Nusxalash"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          {user.role === UserRole.ADMIN && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); openEdit(script); }} className="p-1.5 bg-background rounded-lg text-secondary hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(script.id); }} className="p-1.5 bg-background rounded-lg text-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-background p-4 rounded-2xl text-sm text-secondary font-medium leading-relaxed whitespace-pre-wrap border border-secondary/5">
                        {script.content}
                      </div>

                      {script.tags && script.tags.length > 0 && (
                        <div className="flex gap-2 mt-4 flex-wrap">
                          {script.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/5 px-2 py-1 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL (Create / Edit) */}
      {(isEditing || selectedScript) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-3xl rounded-4xl p-8 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-black text-primary uppercase tracking-tight">
                {isEditing ? (selectedScript ? 'Tahrirlash' : 'Yangi Skript') : selectedScript?.title}
              </h3>
              <button onClick={() => { setSelectedScript(null); setIsEditing(false); }} className="p-2 bg-background rounded-xl text-secondary hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Kategoriya (masalan: Sotuv)" 
                    className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Teglar (vergul bilan)" 
                    className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  {formItems.map((item, index) => (
                    <div key={index} className="bg-background p-4 rounded-3xl border border-secondary/10 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-secondary uppercase tracking-widest">Blok #{index + 1}</span>
                        {formItems.length > 1 && (
                          <button onClick={() => removeFormItem(index)} className="text-rose-500 hover:text-rose-700 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        placeholder="Sarlavha" 
                        className="w-full bg-white border-none rounded-xl px-4 py-2 text-base font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary mb-2"
                        value={item.title}
                        onChange={(e) => updateFormItem(index, 'title', e.target.value)}
                      />
                      <textarea 
                        placeholder="Matn..." 
                        className="w-full bg-white border-none rounded-xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-accent/50 text-primary resize-none h-32"
                        value={item.content}
                        onChange={(e) => updateFormItem(index, 'content', e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {!selectedScript && (
                  <button 
                    onClick={addFormItem}
                    className="w-full py-3 border-2 border-dashed border-secondary/20 rounded-2xl text-secondary font-bold hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                    Yana qo'shish
                  </button>
                )}

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
