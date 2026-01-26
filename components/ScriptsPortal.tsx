
import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_SCRIPTS, ScriptCategory, ScriptSection, SectionType } from '../scriptsData';
import { UserRole } from '../types';

interface ScriptsPortalProps {
  role: UserRole;
}

const ScriptsPortal: React.FC<ScriptsPortalProps> = ({ role }) => {
  const [scripts, setScripts] = useState<ScriptCategory[]>(INITIAL_SCRIPTS);
  const [activeCatId, setActiveCatId] = useState(scripts[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track acknowledged scripts (read progress)
  const [readScripts, setReadScripts] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('delever_read_scripts');
    if (saved) setReadScripts(JSON.parse(saved));
  }, []);

  const isAdmin = role === UserRole.ADMIN;
  const isOperator = role === UserRole.OPERATOR;

  // --- Computed Data ---
  const filteredScripts = useMemo(() => {
    if (!searchQuery) return scripts;
    const query = searchQuery.toLowerCase();
    return scripts.map(cat => ({
      ...cat,
      sections: cat.sections.filter(sec => 
        sec.title.toLowerCase().includes(query) || 
        sec.content.toLowerCase().includes(query)
      )
    })).filter(cat => cat.sections.length > 0 || cat.title.toLowerCase().includes(query));
  }, [scripts, searchQuery]);

  const currentCategory = scripts.find(s => s.id === activeCatId);
  
  const totalSections = useMemo(() => 
    scripts.reduce((acc, cat) => acc + cat.sections.length, 0), 
  [scripts]);
  
  const readProgress = Math.round((readScripts.length / totalSections) * 100) || 0;

  // --- Handlers ---
  const handleAcknowledge = (sectionId: string) => {
    if (readScripts.includes(sectionId)) return;
    const updated = [...readScripts, sectionId];
    setReadScripts(updated);
    localStorage.setItem('delever_read_scripts', JSON.stringify(updated));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newScripts = [...scripts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scripts.length) return;
    [newScripts[index], newScripts[targetIndex]] = [newScripts[targetIndex], newScripts[index]];
    setScripts(newScripts);
  };

  const moveSection = (secIdx: number, direction: 'up' | 'down') => {
    setScripts(prev => prev.map(cat => {
      if (cat.id !== activeCatId) return cat;
      const newSections = [...cat.sections];
      const targetIdx = direction === 'up' ? secIdx - 1 : secIdx + 1;
      if (targetIdx < 0 || targetIdx >= newSections.length) return cat;
      [newSections[secIdx], newSections[targetIdx]] = [newSections[targetIdx], newSections[secIdx]];
      return { ...cat, sections: newSections };
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Nusxa olindi!");
  };

  const handleUpdateSection = (idx: number, updates: Partial<ScriptSection>) => {
    setScripts(prev => prev.map(cat => {
      if (cat.id !== activeCatId) return cat;
      const newSections = [...cat.sections];
      newSections[idx] = { ...newSections[idx], ...updates };
      return { ...cat, sections: newSections };
    }));
  };

  const addSection = () => {
    const newSec: ScriptSection = {
      id: `sec_${Date.now()}`,
      title: 'Yangi punkt',
      content: 'Mazmun...',
      type: 'standard'
    };
    setScripts(prev => prev.map(cat => 
      cat.id === activeCatId ? { ...cat, sections: [...cat.sections, newSec] } : cat
    ));
  };

  const deleteSection = (idx: number) => {
    if (!confirm("O'chirilsinmi?")) return;
    setScripts(prev => prev.map(cat => 
      cat.id === activeCatId ? { ...cat, sections: cat.sections.filter((_, i) => i !== idx) } : cat
    ));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Search & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Skriptlar ichidan qidirish..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 outline-none font-medium transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-4 top-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        
        {isOperator && (
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O'qish progressi</p>
              <p className="text-sm font-black text-slate-900">{readScripts.length} / {totalSections} bo'lim</p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-slate-100 flex items-center justify-center relative overflow-hidden">
               <div 
                 className="absolute bottom-0 left-0 w-full bg-emerald-500 transition-all duration-700" 
                 style={{ height: `${readProgress}%` }}
               />
               <span className="relative z-10 text-xs font-black text-slate-900 mix-blend-difference invert">
                 {readProgress}%
               </span>
            </div>
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${
              isEditing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800'
            }`}
          >
            {isEditing ? '✓ TAYYOR' : '✎ TAHRIRLASH'}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[70vh]">
        {/* Sidebar: Navigation */}
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Kategoriyalar</h4>
          <div className="space-y-1">
            {(isEditing ? scripts : filteredScripts).map((cat, idx) => (
              <div key={cat.id} className="group relative">
                <button
                  onClick={() => setActiveCatId(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-between group ${
                    activeCatId === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-600 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <span className="truncate">{cat.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeCatId === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {cat.sections.length}
                  </span>
                </button>
                
                {isEditing && (
                  <div className="absolute -right-2 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => moveCategory(idx, 'up')} className="p-1 bg-white border border-slate-200 rounded shadow-sm hover:text-blue-500">▲</button>
                    <button onClick={() => moveCategory(idx, 'down')} className="p-1 bg-white border border-slate-200 rounded shadow-sm hover:text-blue-500">▼</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && isEditing && (
            <button 
              onClick={() => {
                const newCat = { id: `cat_${Date.now()}`, title: 'Yangi Kategoriya', sections: [] };
                setScripts([...scripts, newCat]);
                setActiveCatId(newCat.id);
              }}
              className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl font-bold hover:border-blue-400 hover:text-blue-500 transition-all text-sm"
            >
              + Bo'lim qo'shish
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-[2rem] p-8 lg:p-12 border border-slate-100 shadow-sm min-h-full relative overflow-hidden">
            {currentCategory ? (
              <div className="space-y-12">
                <header className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-8">
                  {isEditing ? (
                    <input 
                      className="text-4xl font-black text-slate-900 outline-none w-full bg-slate-50 rounded-xl px-4 py-2"
                      value={currentCategory.title}
                      onChange={(e) => setScripts(prev => prev.map(s => s.id === activeCatId ? { ...s, title: e.target.value } : s))}
                    />
                  ) : (
                    <div className="flex items-center gap-6">
                      <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{currentCategory.title}</h2>
                        <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-[0.1em]">Amaliy qo'llanma</p>
                      </div>
                      {isOperator && (
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100">
                          {currentCategory.sections.filter(s => readScripts.includes(s.id)).length} / {currentCategory.sections.length} o'qildi
                        </div>
                      )}
                    </div>
                  )}
                  {isEditing && (
                    <button onClick={addSection} className="shrink-0 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
                      + Yangi Punkt
                    </button>
                  )}
                </header>

                <div className="space-y-10">
                  {currentCategory.sections.map((sec, sIdx) => {
                    const isRead = readScripts.includes(sec.id);
                    return (
                      <div 
                        key={sec.id}
                        className={`relative group rounded-[2.5rem] border-2 p-8 transition-all duration-500 ${
                          isRead ? 'bg-slate-50/50 border-emerald-200 opacity-60' :
                          sec.type === 'prohibited' ? 'bg-rose-50 border-rose-100 text-rose-900' :
                          sec.type === 'mandatory' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                          sec.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                          'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {isRead && !isEditing && (
                          <div className="absolute top-8 right-8 flex items-center gap-2 text-emerald-600 bg-white px-4 py-2 rounded-full shadow-sm border border-emerald-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">O'qib chiqildi</span>
                          </div>
                        )}

                        {isEditing && (
                          <div className="absolute top-6 right-6 flex items-center gap-2">
                            <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                              <button onClick={() => moveSection(sIdx, 'up')} className="p-1 hover:text-blue-500">▲</button>
                              <button onClick={() => moveSection(sIdx, 'down')} className="p-1 hover:text-blue-500">▼</button>
                            </div>
                            <select 
                              className="text-[10px] font-black p-1.5 rounded-lg border border-slate-200 outline-none"
                              value={sec.type}
                              onChange={(e) => handleUpdateSection(sIdx, { type: e.target.value as SectionType })}
                            >
                              <option value="standard">Standard</option>
                              <option value="mandatory">Mandatory</option>
                              <option value="prohibited">Prohibited</option>
                              <option value="success">Success</option>
                            </select>
                            <button onClick={() => deleteSection(sIdx)} className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        )}

                        <div className="max-w-4xl space-y-6">
                          <div className="flex items-center gap-3">
                            {isEditing ? (
                              <input 
                                className="text-2xl font-black bg-white border border-slate-200 rounded-xl px-4 py-2 w-full outline-none"
                                value={sec.title}
                                onChange={(e) => handleUpdateSection(sIdx, { title: e.target.value })}
                              />
                            ) : (
                              <h5 className="text-2xl font-black tracking-tight">{sec.title}</h5>
                            )}
                            {!isEditing && sec.type !== 'standard' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-current">
                                {sec.type}
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <textarea 
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-4 font-medium min-h-[120px] outline-none"
                              value={sec.content}
                              onChange={(e) => handleUpdateSection(sIdx, { content: e.target.value })}
                            />
                          ) : (
                            <div className="text-lg font-medium leading-relaxed opacity-80 whitespace-pre-wrap">
                              {sec.content}
                            </div>
                          )}

                          {/* Rich Media Section */}
                          {(sec.imageUrl || sec.audioUrl || isEditing) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                              <div className="space-y-3">
                                {isEditing && (
                                  <input 
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200"
                                    placeholder="Rasm URL..."
                                    value={sec.imageUrl || ''}
                                    onChange={(e) => handleUpdateSection(sIdx, { imageUrl: e.target.value })}
                                  />
                                )}
                                {sec.imageUrl && (
                                  <div className="rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                                    <img src={sec.imageUrl} className="w-full h-48 object-cover" alt="Instruction" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3">
                                {isEditing && (
                                  <input 
                                    className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200"
                                    placeholder="Audio URL..."
                                    value={sec.audioUrl || ''}
                                    onChange={(e) => handleUpdateSection(sIdx, { audioUrl: e.target.value })}
                                  />
                                )}
                                {sec.audioUrl && (
                                  <div className="p-6 rounded-3xl bg-white/50 backdrop-blur-sm border border-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400">Namuna Talaffuz</p>
                                    <audio controls className="w-full h-10 custom-audio-player">
                                      <source src={sec.audioUrl} type="audio/mpeg" />
                                    </audio>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {!isEditing && (
                            <div className="flex flex-wrap gap-4 pt-4">
                              <button 
                                onClick={() => copyToClipboard(sec.content)}
                                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-md"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                Nusxa ko'chirish
                              </button>

                              {isOperator && !isRead && (
                                <button 
                                  onClick={() => handleAcknowledge(sec.id)}
                                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                  Tanishdim
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isOperator && !isEditing && currentCategory.sections.every(s => readScripts.includes(s.id)) && (
                  <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl shadow-emerald-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h4 className="text-2xl font-black">Barakalla!</h4>
                      <p className="font-medium opacity-90">Ushbu bo'limdagi barcha skriptlarni o'rganib chiqdingiz.</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                      🎉
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-800">Ma'lumotlar bazasi</h3>
                <p className="font-medium text-slate-500 mt-2">Chap tarafdan kerakli bo'limni tanlang yoki qidiring</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-audio-player::-webkit-media-controls-panel {
          background-color: transparent;
        }
        .custom-audio-player::-webkit-media-controls-play-button {
          background-color: #3b82f6;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default ScriptsPortal;
