import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';
import Dropdown from './ui/Dropdown';

interface AdminPortalProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUsers: (users: User[]) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ users, onAddUser, onUpdateUsers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false); // YANGI

  // FILTERS
  const [activeRole, setActiveRole] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: UserRole.OPERATOR,
    telegramId: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      if (!editingUser && name === 'fullName' && !prev.username) {
        newData.username = generateUsername(value);
      }
      return newData;
    });
  };

  const generateUsername = (fullName: string) => {
    return fullName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 100);
  };

  const generatePassword = () => {
    const randomPass = Math.floor(100000 + Math.random() * 900000).toString(); 
    setFormData(prev => ({ ...prev, password: randomPass }));
  };

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        username: user.username,
        password: '',
        role: user.role,
        telegramId: user.telegramId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ fullName: '', username: '', password: '', role: UserRole.OPERATOR, telegramId: '' });
    }
    setIsModalOpen(true);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        setToast({ message: "Xodim ma'lumotlari yangilandi!", type: 'success' });
        
        const updatedList = users.map(u => u.id === editingUser.id ? { ...u, ...formData, password: u.password } : u);
        onUpdateUsers(updatedList);
      } else {
        await api.register(formData);
        setToast({ message: "Yangi xodim muvaffaqiyatli qo'shildi!", type: 'success' });
        window.location.reload(); 
      }
      setIsModalOpen(false);
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi. Login band bo'lishi mumkin.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Haqiqatan ham o'chirmoqchimisiz? (Status: INACTIVE bo'ladi)")) {
      try {
        await api.updateUser(id, { status: 'INACTIVE' });
        const updatedList = users.map(u => u.id === id ? { ...u, status: 'INACTIVE' } : u);
        onUpdateUsers(updatedList as any);
        setToast({ message: "Xodim arxivlandi", type: 'info' });
      } catch (error) {
        setToast({ message: "Xatolik yuz berdi", type: 'error' });
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.updateUser(id, { status: 'ACTIVE' });
      const updatedList = users.map(u => u.id === id ? { ...u, status: 'ACTIVE' } : u);
      onUpdateUsers(updatedList as any);
      setToast({ message: "Xodim qayta tiklandi", type: 'success' });
    } catch (error) {
      setToast({ message: "Xatolik yuz berdi", type: 'error' });
    }
  };

  // YANGI: Test Xabar Yuborish (UX yaxshilandi)
  const handleTestNotification = async () => {
    if (!editingUser) return;
    setIsTestLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/test/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id })
      });
      
      if (res.ok) {
        setToast({ message: "Test xabar yuborildi!", type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || "Xatolik", type: 'error' });
      }
    } catch (error) {
      setToast({ message: "Server bilan aloqa yo'q", type: 'error' });
    } finally {
      setIsTestLoading(false);
    }
  };

  const roleOptions = [
    { value: UserRole.OPERATOR, label: 'Operator', icon: '🎧' },
    { value: UserRole.COURIER, label: 'Kuryer', icon: '🛵' },
    { value: UserRole.CASHIER, label: 'Kassir', icon: '💰' },
    { value: UserRole.ADMIN, label: 'Admin', icon: '🛡️' }
  ];

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesRole = activeRole === 'ALL' || user.role === activeRole;
      const matchesSearch = user.fullName.toLowerCase().includes(search.toLowerCase()) || 
                            user.username.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = (user.status || 'ACTIVE') === statusFilter;

      return matchesRole && matchesSearch && matchesStatus;
    });
  }, [users, activeRole, search, statusFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header & Filters */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Xodimlar Boshqaruvi</h2>
            <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
              Jami: {filteredUsers.length} ta xodim
            </p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
            Yangi xodim
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
            {['ALL', UserRole.OPERATOR, UserRole.COURIER, UserRole.CASHIER, UserRole.ADMIN].map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeRole === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {role === 'ALL' ? 'Barchasi' : role}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Ism yoki Login..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <svg className="absolute left-3 top-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
              >
                Faol
              </button>
              <button 
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === 'INACTIVE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
              >
                Arxiv
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Xodim</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Roli</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Login</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Telegram ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border shadow-inner ${
                        user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-500 border-purple-200' :
                        user.role === UserRole.OPERATOR ? 'bg-blue-100 text-blue-500 border-blue-200' :
                        user.role === UserRole.COURIER ? 'bg-amber-100 text-amber-500 border-amber-200' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{user.fullName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {user.id.slice(-4)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      user.role === UserRole.OPERATOR ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      user.role === UserRole.COURIER ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="font-bold text-slate-600">@{user.username}</span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className={`text-xs font-bold ${user.telegramId ? 'text-blue-500' : 'text-slate-300'}`}>
                      {user.telegramId || '-'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModal(user)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                        title="Tahrirlash"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                      </button>
                      
                      {statusFilter === 'ACTIVE' ? (
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                          title="Arxivlash"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRestore(user.id)}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                          title="Tiklash"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">
                {editingUser ? 'Xodimni Tahrirlash' : 'Yangi Xodim'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-2">F.I.SH</label>
                <input 
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Masalan: Eshmat Toshmatov"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-2">Login</label>
                  <input 
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="login123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-2">
                    {editingUser ? 'Yangi Parol (ixtiyoriy)' : 'Parol'}
                  </label>
                  <div className="relative">
                    <input 
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required={!editingUser}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all pr-10"
                      placeholder="••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-4 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={generatePassword}
                    className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-2 hover:underline"
                  >
                    Generatsiya qilish
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-2">Telegram ID</label>
                <div className="flex gap-2">
                  <input 
                    name="telegramId"
                    value={formData.telegramId}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Masalan: 123456789"
                  />
                  {editingUser && formData.telegramId && (
                    <button 
                      type="button"
                      onClick={handleTestNotification}
                      disabled={isTestLoading}
                      className={`px-4 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 ${
                        isTestLoading 
                          ? 'bg-slate-100 text-slate-400 cursor-wait' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {isTestLoading ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      )}
                      Test
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Dropdown 
                  label="Lavozim"
                  options={roleOptions}
                  value={formData.role}
                  onChange={(val) => setFormData({ ...formData, role: val as UserRole })}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl mt-4 disabled:opacity-50"
              >
                {loading ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
