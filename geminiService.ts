import { GoogleGenAI } from "@google/genai";

// Vite env o'zgaruvchilarini olish
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Agar API kalit yo'q bo'lsa, xatolikni oldini olish uchun shartli initsializatsiya
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const getPerformanceInsights = async (kpiData: any, role: string) => {
  if (!ai) {
    console.warn("Gemini API kaliti topilmadi. .env faylini tekshiring.");
    return "AI tahlili ishlashi uchun API kalit kiritilishi kerak.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Model versiyasini yangiladim
      contents: `Siz Delever eko-tizimining aqlli yordamchisiz. Quyidagi KPI ma'lumotlarini tahlil qiling va ${role} uchun o'zbek tilida qisqa (2-3 jumla) tavsiya bering: ${JSON.stringify(kpiData)}`,
    });
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ma'lumotlarni tahlil qilishda xatolik yuz berdi.";
  }
};
