// API_URL ni o'zgartiramiz
// Agar production bo'lsa, '/api' ishlatamiz (Nginx proxy qiladi)
// Agar local bo'lsa, 'http://localhost:3001/api'

export const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

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
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  updateUser: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
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
    if (!res.ok) throw new Error('Failed to generate schedule');
    return res.json();
  },

  getSchedule: async (userId: string) => {
    const res = await fetch(`${API_URL}/schedule/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch schedule');
    return res.json();
  },

  // KPI
  saveDailyKPI: async (data: { userId: string, date: string, scriptScore?: number, errorScore?: number, disciplineScore?: number, bonusAmount?: number, comment: string }) => {
    const res = await fetch(`${API_URL}/kpi/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save KPI');
    return res.json();
  },

  confirmKPI: async (data: { userId: string, week: string }) => {
    const res = await fetch(`${API_URL}/kpi/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to confirm KPI');
    return res.json();
  },

  confirmAllKPI: async (data: { week: string, role: string }) => {
    const res = await fetch(`${API_URL}/kpi/confirm-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to confirm all KPI');
    return res.json();
  },

  getKPIReport: async (userId: string, month: string) => {
    const res = await fetch(`${API_URL}/kpi/report/${userId}?month=${month}`);
    if (!res.ok) throw new Error('Failed to fetch KPI report');
    return res.json();
  },

  getKPIHistory: async (userId: string, month?: string) => {
    const url = month
      ? `${API_URL}/kpi/history/${userId}?month=${month}`
      : `${API_URL}/kpi/history/${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch KPI history');
    return res.json();
  },

  // Orders (Master Data)
  getOrders: async (page = 1, limit = 200) => {
    const res = await fetch(`${API_URL}/orders?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    // Pagination formatini qo'llab-quvvatlash
    return Array.isArray(data) ? data : data.orders;
  },

  importOrders: async (orders: any[]) => {
    const res = await fetch(`${API_URL}/orders/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error('Failed to import orders');
    return res.json();
  },

  deleteAllOrders: async () => {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete orders');
    return res.json();
  },

  // Payments
  getPayments: async (status?: string) => {
    const url = status ? `${API_URL}/payments?status=${status}` : `${API_URL}/payments`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  },

  payPayment: async (id: string) => {
    const res = await fetch(`${API_URL}/payments/${id}/pay`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to process payment');
    return res.json();
  },

  cancelPayment: async (id: string) => {
    const res = await fetch(`${API_URL}/payments/${id}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to cancel payment');
    return res.json();
  },

  resetAllPayments: async () => {
    const res = await fetch(`${API_URL}/payments/reset-all`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset payments');
    return res.json();
  },

  getPendingFeedback: async (userId: string) => {
    const res = await fetch(`${API_URL}/payments/pending-feedback/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch pending feedback');
    return res.json();
  },

  // Checklist
  getAdminChecklist: async () => {
    const res = await fetch(`${API_URL}/admin/checklist`);
    if (!res.ok) throw new Error('Failed to fetch checklist');
    return res.json();
  },

  // Ratings
  getOperators: async () => {
    const res = await fetch(`${API_URL}/operators`);
    if (!res.ok) throw new Error('Failed to fetch operators');
    return res.json();
  },

  getCouriers: async () => {
    const res = await fetch(`${API_URL}/couriers`);
    if (!res.ok) throw new Error('Failed to fetch couriers');
    return res.json();
  },

  saveRating: async (data: { fromUserId: string, toUserId: string, score: number, comment: string, week: string }) => {
    const res = await fetch(`${API_URL}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save rating');
    return res.json();
  },

  getRatingsForCourierAndWeek: async (fromUserId: string, week: string) => {
    const res = await fetch(`${API_URL}/ratings/courier/${fromUserId}/${week}`);
    if (!res.ok) throw new Error('Failed to fetch ratings');
    return res.json();
  },

  getAllRatings: async () => {
    const res = await fetch(`${API_URL}/ratings/all`);
    if (!res.ok) throw new Error('Failed to fetch all ratings');
    return res.json();
  },

  // Scripts
  getScripts: async () => {
    const res = await fetch(`${API_URL}/scripts`);
    if (!res.ok) throw new Error('Failed to fetch scripts');
    return res.json();
  },

  createScript: async (data: Record<string, unknown> | Record<string, unknown>[]) => {
    const res = await fetch(`${API_URL}/scripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create script');
    return res.json();
  },

  updateScript: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update script');
    return res.json();
  },

  deleteScript: async (id: string) => {
    const res = await fetch(`${API_URL}/scripts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete script');
    return res.json();
  }
};
