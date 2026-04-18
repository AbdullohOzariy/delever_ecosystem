import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { api } from '../api';
import Toast from './ui/Toast';

interface AdminPortalProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ users, onUpdateUsers }) => {
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

      <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-surface p-8 rounded-4xl shadow-soft border border-white/50">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight uppercase">Xodimlar</h2>
          <p className="text-secondary font-medium text-xs uppercase tracking-widest mt-1">
            Jami: {users.length} ta xodim
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          + Yangi Xodim
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-surface p-6 rounded-4xl shadow-soft border border-white/50 group hover:shadow-hover transition-all duration-300">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border ${
                  user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border-purple-200' :
                  user.role === UserRole.OPERATOR ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  user.role === UserRole.COURIER ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-primary text-lg">{user.fullName}</h3>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                user.status === UserStatus.ACTIVE 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}>
                {user.status}
              </span>
            </div>
            
            <div className="space-y-3 mb-8 bg-background p-4 rounded-2xl border border-secondary/5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-secondary">Login:</span>
                <span className="text-primary font-bold">{user.username}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-secondary">Telegram ID:</span>
                <span className="text-primary font-bold">{user.telegramId || '-'}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button 
                onClick={() => setEditingUser(user)}
                className="flex-1 py-3 bg-background text-secondary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors border border-secondary/10"
              >
                Tahrirlash
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors border border-rose-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-4xl p-8 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-tight">Yangi Xodim</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" 
                placeholder="F.I.SH" 
                required 
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Login" 
                required 
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Parol" 
                required 
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
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
                  className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
                  onChange={e => setNewUser({...newUser, telegramId: e.target.value})}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-2xl font-bold text-secondary hover:bg-background transition-colors">Bekor qilish</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-4xl p-8 shadow-2xl border border-white/50 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-tight">Tahrirlash</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input 
                type="text" 
                value={editingUser.fullName}
                onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
              />
              <input 
                type="text" 
                value={editingUser.username}
                onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
              />
              <input 
                type="password" 
                placeholder="Yangi parol (ixtiyoriy)" 
                onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
              />
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                  className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select 
                  value={editingUser.status}
                  onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}
                  className="bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
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
                className="w-full bg-background border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/50 text-primary transition-all"
              />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 rounded-2xl font-bold text-secondary hover:bg-background transition-colors">Bekor qilish</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-accent hover:text-primary transition-all shadow-lg shadow-primary/20 active:scale-95">Yangilash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
