// ─── Haftalik davr yordamchilari ───────────────────────────────────────────
// Hafta: YAKSHANBA 00:00 → SHANBA 23:59 (Toshkent vaqti).
// Hafta "kaliti" sifatida shu haftaning Yakshanba sanasi "YYYY-MM-DD" ishlatiladi
// (server shu kalitni Toshkent oralig'iga aylantiradi, to'lov `period` kaliti ham shu).

// Mahalliy sanani "YYYY-MM-DD" ga aylantiradi — toISOString'siz, shuning uchun
// vaqt mintaqasi tufayli bir kunga siljimaydi.
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Berilgan sana (default: bugun) tegishli haftaning YAKSHANBASINI qaytaradi.
// getDay(): Yakshanba = 0, shuning uchun shuncha kun orqaga suramiz.
export const weekStartOf = (d: Date = new Date()): string => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return ymd(x);
};

// Kalendardan tanlangan istalgan "YYYY-MM-DD" sana — o'sha hafta Yakshanbasiga snap.
export const weekStartFromDateStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return weekStartOf(new Date(y, m - 1, d));
};

// Hafta kalitini (Yakshanba) oldinga/orqaga suradi.
export const shiftWeek = (sundayStr: string, deltaWeeks: number): string => {
  const [y, m, d] = sundayStr.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + deltaWeeks * 7));
};

// UI uchun ko'rinish: "08.06.2026 — 14.06.2026".
export const weekRangeLabel = (sundayStr: string): string => {
  const [y, m, d] = sundayStr.split('-').map(Number);
  const sunday = new Date(y, m - 1, d);
  const saturday = new Date(y, m - 1, d + 6);
  const f = (x: Date) =>
    x.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${f(sunday)} — ${f(saturday)}`;
};
