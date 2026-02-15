import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface AdminPortalProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUsers: (users: User[]) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ users, onAddUser, onUpdateUsers }) => {
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.OPERATOR, status: UserStatus.ACTIVE });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.username && newUser.fullName && newUser.password) {
      try {
        await api.register(newUser);
        setNewUser({ role: UserRole.OPERATOR, status: UserStatus.ACTIVE });
        setIsModalOpen(false);
        setToast({ message: "Xodim muvaffaqiyatli qo'shildi", type: 'success' });
      } catch (error) {
        setToast({ message: "Xatolik: Login band bo'lishi mumkin", type: 'error' });
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        await api.updateUser(editingUser.id, editingUser);
        const updatedUsers = await api.getUsers();
        onUpdateUsers(updatedUsers);
        setEditingUser(null);
        setToast({ message: "Ma'lumotlar yangilandi", type: 'success' });
      } catch (error) {
        setToast({ message: "Yangilashda xatolik", type: 'error' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Haqiqatan ham o'chirmoqchimisiz?")) {
      try {
        await api.deleteUser(id);
        const updatedUsers = await api.getUsers();
        onUpdateUsers(updatedUsers);
        setToast({ message: "Xodim o'chirildi", type: 'info' });
      } catch (error) {
        setToast({ message: "O'chirishda xatolik", type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Xodimlar</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Jami: {users.length} ta xodim
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-slate-900 dark:border-white"
        >
          + Yangi Xodim
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] group hover:translate-y-[-2px] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border-2 ${
                  user.role === UserRole.ADMIN ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-500' :
                  user.role === UserRole.OPERATOR ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-500' :
                  user.role === UserRole.COURIER ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-500' :
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-500'
                }`}>
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{user.fullName}</h3>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                user.status === UserStatus.ACTIVE 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
              }`}>
                {user.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400 dark:text-slate-500">Login:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">{user.username}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400 dark:text-slate-500">Telegram ID:</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">{user.telegramId || '-'}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button 
                onClick={() => setEditingUser(user)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              >
                Tahrirlash
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors border-2 border-transparent hover:border-rose-200 dark:hover:border-rose-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl border-2 border-slate-900 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Yangi Xodim</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" 
                placeholder="F.I.SH" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Login" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Parol" 
                required 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  value={newUser.role}
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  placeholder="Telegram ID" 
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                  onChange={e => setNewUser({...newUser, telegramId: e.target.value})}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Bekor qilish</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 dark:border-white">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-8 shadow-2xl border-2 border-slate-900 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">Tahrirlash</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input 
                type="text" 
                value={editingUser.fullName}
                onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
              />
              <input 
                type="text" 
                value={editingUser.username}
                onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
              />
              <input 
                type="password" 
                placeholder="Yangi parol (ixtiyoriy)" 
                onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select 
                  value={editingUser.status}
                  onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
                >
                  {Object.values(UserStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <input 
                type="text" 
                value={editingUser.telegramId || ''}
                placeholder="Telegram ID"
                onChange={e => setEditingUser({...editingUser, telegramId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-white text-slate-900 dark:text-white transition-all"
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Bekor qilish</button>
                <button type="submit" className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-slate-200 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 dark:border-white">Yangilash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
