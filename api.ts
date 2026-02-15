// API_URL ni o'zgartiramiz
// Agar production bo'lsa, '/api' ishlatamiz (Nginx proxy qiladi)
// Agar local bo'lsa, 'http://localhost:3001/api'

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  telegramLogin: async (data: { telegramId: number, username?: string, password?: string }) => {
    const res = await fetch(`${API_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Telegram login failed');
    return res.json();
  },

  register: async (userData: any) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error('Register failed');
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
  },

  updateUser: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  },

  // Schedule
  generateSchedule: async (data: { userId: string, startDate: string, endDate: string, pattern: string }) => {
    const res = await fetch(`${API_URL}/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getSchedule: async (userId: string) => {
    const res = await fetch(`${API_URL}/schedule/${userId}`);
    return res.json();
  },

  // KPI
  saveDailyKPI: async (data: { userId: string, date: string, scriptScore?: number, errorScore?: number, disciplineScore?: number, bonusAmount?: number, comment: string }) => {
    const res = await fetch(`${API_URL}/kpi/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  confirmKPI: async (data: { userId: string, week: string }) => {
    const res = await fetch(`${API_URL}/kpi/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  confirmAllKPI: async (data: { week: string, role: string }) => {
    const res = await fetch(`${API_URL}/kpi/confirm-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getKPIReport: async (userId: string, month: string) => {
    const res = await fetch(`${API_URL}/kpi/report/${userId}?month=${month}`);
    return res.json();
  },

  getKPIHistory: async (userId: string, month?: string) => {
    const url = month 
      ? `${API_URL}/kpi/history/${userId}?month=${month}`
      : `${API_URL}/kpi/history/${userId}`;
    const res = await fetch(url);
    return res.json();
  },

  // Orders (Master Data)
  getOrders: async () => {
    const res = await fetch(`${API_URL}/orders`);
    return res.json();
  },

  importOrders: async (orders: any[]) => {
    const res = await fetch(`${API_URL}/orders/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    return res.json();
  },

  deleteAllOrders: async () => {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Payments
  getPayments: async (status?: string) => {
    const url = status ? `${API_URL}/payments?status=${status}` : `${API_URL}/payments`;
    const res = await fetch(url);
    return res.json();
  },

  payPayment: async (id: string) => {
    const res = await fetch(`${API_URL}/payments/${id}/pay`, {
      method: 'POST',
    });
    return res.json();
  },

  // Checklist
  getAdminChecklist: async () => {
    const res = await fetch(`${API_URL}/admin/checklist`);
    return res.json();
  },

  // Ratings (YANGI)
  getOperators: async () => {
    const res = await fetch(`${API_URL}/operators`);
    return res.json();
  },

  getCouriers: async () => {
    const res = await fetch(`${API_URL}/couriers`);
    return res.json();
  },

  saveRating: async (data: { fromUserId: string, toUserId: string, score: number, comment: string, week: string }) => {
    const res = await fetch(`${API_URL}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getRatingsForCourierAndWeek: async (fromUserId: string, week: string) => {
    const res = await fetch(`${API_URL}/ratings/courier/${fromUserId}/${week}`);
    return res.json();
  },

  getAllRatings: async () => {
    const res = await fetch(`${API_URL}/ratings/all`);
    return res.json();
  },

  // SCRIPTS (YANGI)
  getScripts: async () => {
    const res = await fetch(`${API_URL}/scripts`);
    return res.json();
  },

  createScript: async (data: any) => {
    const res = await fetch(`${API_URL}/scripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateScript: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteScript: async (id: string) => {
    const res = await fetch(`${API_URL}/scripts/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
};
