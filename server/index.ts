import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient, OrderStatus, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; 

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'; 

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ---------------------------------------------------------
// UTILS
// ---------------------------------------------------------

// Haftalik hisobot logikasi (Dushanba - Yakshanba)
const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay(); 
  
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); 
  end.setHours(23, 59, 59, 999);

  console.log(`Week Range for ${dateStr}:`, start.toISOString(), end.toISOString()); 
  return { start, end };
};

// YYYY-Www formatidan haftaning Dushanba sanasini olish
function getWeekStartFromWeekString(weekString: string) {
  // Agar sana formati kelsa (2026-02-02), o'zini qaytarish
  if (!weekString.includes('-W')) {
    const date = new Date(weekString);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const [yearStr, weekNumStr] = weekString.split('-W');
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekNumStr);

  const jan1 = new Date(year, 0, 1);
  const days = (weekNum - 1) * 7;

  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + days - (jan1.getDay() + 6) % 7); // Dushanbaga sozlash
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr);
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart || !timePart) return new Date(dateStr);
  return new Date(`${datePart}T${timePart}`);
};

const transliterate = (text: string) => {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya', 'ғ': 'g\'', 'қ': 'q', 'ҳ': 'h', 'ў': 'o\''
  };
  return text.toLowerCase().split('').map(char => map[char] || char).join('');
};

const cleanString = (str: string) => {
  if (!str) return '';
  let clean = str.replace(/^\uFEFF/, '').trim().toLowerCase();
  return transliterate(clean);
};

// ---------------------------------------------------------
// TELEGRAM NOTIFICATION
// ---------------------------------------------------------
const sendTelegramMessage = async (chatId: string, text: string): Promise<any> => {
  if (!chatId || chatId === 'null') return;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    const data = await response.json();
    console.log(`📩 Telegram xabar yuborildi: ${chatId}`, data);
    return data;
  } catch (error) {
    console.error("Telegram xabar yuborishda xatolik:", error);
    return null;
  }
};

// TEST NOTIFICATION ENDPOINT
app.post('/api/test/notification', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.telegramId) {
      return res.status(400).json({ error: "Userda Telegram ID yo'q" });
    }

    const message = `🔔 <b>Test Xabarnoma</b>\n\nSalom, ${user.fullName}!\nBu tizimdan yuborilgan test xabar.\n\nAgar buni o'qiyotgan bo'lsangiz, demak integratsiya ishlayapti! 🚀`;
    
    const result = await sendTelegramMessage(user.telegramId, message);
    
    if (result && result.ok) {
      res.json({ message: "Xabar yuborildi" });
    } else {
      res.status(500).json({ error: "Telegram API xatosi: " + (result ? result.description : "Noma'lum") });
    }
  } catch (error) {
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ... (KPI RULES va AUTH qismi o'zgarishsiz) ...

// ---------------------------------------------------------
// KPI NORMATIVES (YANGILANGAN)
// ---------------------------------------------------------
const KPI_RULES = {
  getSpeedScore: (minutes: number) => {
    if (minutes < 35) return 5;
    if (minutes <= 40) return 4;
    if (minutes <= 45) return 3;
    if (minutes <= 55) return 2;
    return 1;
  },
  getErrorScore: (avgErrorsPerDay: number) => {
    if (avgErrorsPerDay === 0) return 5;
    if (avgErrorsPerDay <= 1.0) return 4;
    if (avgErrorsPerDay <= 2.0) return 3;
    if (avgErrorsPerDay <= 3.0) return 2;
    return 1;
  },
  getCheckScore: (amount: number) => {
    if (amount > 110000) return 5;
    if (amount >= 105000) return 4;
    if (amount >= 100000) return 3;
    if (amount >= 95000) return 2;
    return 1;
  },
  getScriptScore: (rating: number) => {
    if (rating >= 4.8) return 5;
    if (rating >= 4.5) return 4;
    if (rating >= 4.2) return 3;
    if (rating >= 4.0) return 2;
    return 1;
  },
  getOrderCountScore: (count: number) => {
    if (count > 2000) return 5;
    if (count >= 1900) return 4;
    if (count >= 1700) return 3;
    if (count >= 1500) return 2;
    return 1;
  },
  getDisciplineScore: (violations: number) => {
    if (violations === 0) return 5;
    if (violations <= 2) return 4;
    if (violations === 3) return 3;
    if (violations <= 5) return 2;
    return 1;
  }
};

// ---------------------------------------------------------
// AUTH & INIT
// ---------------------------------------------------------
const initDefaultAdmin = async () => {
  try {
    const adminUsername = 'Bozorov';
    const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('8852610', 10);
      await prisma.user.create({
        data: { username: adminUsername, fullName: 'Bozorov (Admin)', password: hashedPassword, role: 'ADMIN', status: 'ACTIVE' }
      });
      console.log(`✅ Admin yaratildi: ${adminUsername}`);
    }
  } catch (error) { console.error("Init error:", error); }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, fullName, password, role, telegramId } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) return res.status(400).json({ error: "Bu login band." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ 
      data: { 
        username, 
        fullName, 
        password: hashedPassword, 
        role, 
        status: 'ACTIVE',
        telegramId: telegramId || null
      } 
    });
    res.json({ message: "Xodim qo'shildi", userId: user.id });
  } catch (error) { res.status(400).json({ error: "Xatolik" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Login xato" });
    
    if (user.status === 'INACTIVE') return res.status(403).json({ error: "Sizning hisobingiz bloklangan." });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) { res.status(500).json({ error: "Tizim xatoligi" }); }
});

// YANGI: Telegram Login / Link
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const { telegramId, username, password } = req.body;

    if (!telegramId) return res.status(400).json({ error: "Telegram ID kerak" });

    // 1. Telegram ID bo'yicha qidirish
    let user = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });

    if (user) {
      // Topildi -> Login
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ token, user: userWithoutPassword });
    }

    // 2. Topilmadi -> Username/Password bilan bog'lash
    if (username && password) {
      user = await prisma.user.findUnique({ where: { username } });
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }

      // Bog'lash
      user = await prisma.user.update({
        where: { id: user.id },
        data: { telegramId: String(telegramId) }
      });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ token, user: userWithoutPassword });
    }

    // 3. Hech narsa yo'q -> Login so'rash
    return res.status(404).json({ error: "User topilmadi. Iltimos, login qiling." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Tizim xatoligi" });
  }
});

// GET Users (Filtr bilan)
app.get('/api/users', async (req, res) => {
  const { status } = req.query; 
  
  const where: any = {};
  if (status) where.status = status;

  const users = await prisma.user.findMany({
    where,
    select: { id: true, username: true, fullName: true, role: true, status: true, telegramId: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(users);
});

// UPDATE User
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, username, role, password, status, telegramId } = req.body;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (username) updateData.username = username;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (telegramId !== undefined) updateData.telegramId = telegramId || null;
    
    if (password && password.length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });

    res.json({ message: "Xodim yangilandi", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Yangilashda xatolik" });
  }
});

// ... (Qolgan Import, Schedule qismlari o'zgarishsiz) ...

app.post('/api/orders/import', async (req, res) => {
  try {
    const { orders } = req.body; 
    if (!Array.isArray(orders)) return res.status(400).json({ error: "Noto'g'ri format" });

    console.log(`📥 Import boshlandi: ${orders.length} ta buyurtma`);
    
    // DEBUG: Birinchi buyurtmani tekshirish
    if (orders.length > 0) {
      console.log("Birinchi buyurtma namunasi:", orders[0]);
    }

    let allUsers = await prisma.user.findMany({
      select: { id: true, fullName: true, role: true }
    });

    const userMap = new Map<string, string>();
    const updateMap = () => {
      userMap.clear();
      allUsers.forEach(u => {
        const cleanName = cleanString(u.fullName);
        userMap.set(cleanName, u.id);
        const parts = cleanName.split(' ');
        if (parts.length > 0) userMap.set(parts[0], u.id);
        if (parts.length > 1) userMap.set(parts[1], u.id);
      });
    };
    updateMap();

    const newOperators = new Set<string>();
    const newCouriers = new Set<string>();

    orders.forEach((o: any) => {
      const opName = cleanString(o.operatorName);
      const crName = cleanString(o.courierName);

      if (opName && !userMap.has(opName)) newOperators.add(opName);
      if (crName && !userMap.has(crName)) newCouriers.add(crName);
    });

    for (const name of newOperators) {
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const username = name.replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      const hashedPassword = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: { username, fullName: formattedName, password: hashedPassword, role: 'OPERATOR', status: 'ACTIVE' }
      });
      allUsers.push(user as any);
      console.log(`➕ Yangi Operator yaratildi: ${formattedName}`);
    }

    for (const name of newCouriers) {
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      const username = name.replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      const hashedPassword = await bcrypt.hash('123456', 10);
      const user = await prisma.user.create({
        data: { username, fullName: formattedName, password: hashedPassword, role: 'COURIER', status: 'ACTIVE' }
      });
      allUsers.push(user as any);
      console.log(`➕ Yangi Kuryer yaratildi: ${formattedName}`);
    }

    updateMap();

    const formattedOrders = orders.map((o: any) => {
      const amount = parseFloat(o.amount);
      const deliveryPrice = parseFloat(o.deliveryPrice);
      const deliveryTimeSeconds = parseInt(o.deliveryTimeSeconds);

      const opName = cleanString(o.operatorName);
      const crName = cleanString(o.courierName);

      const operatorId = opName ? userMap.get(opName) : null;
      const courierId = crName ? userMap.get(crName) : null;

      return {
        id: String(o.id).trim(),
        customerName: o.customerName || 'Mijoz',
        address: o.address || '',
        amount: isNaN(amount) ? 0 : amount,
        deliveryPrice: isNaN(deliveryPrice) ? 0 : deliveryPrice,
        deliveryType: o.deliveryType || '', 
        branch: o.branch || null, // YANGI: Filial nomi
        status: OrderStatus.DELIVERED, 
        createdAt: parseDate(o.createdAt),
        deliveredAt: parseDate(o.createdAt),
        deliveryTimeSeconds: isNaN(deliveryTimeSeconds) ? 0 : deliveryTimeSeconds,
        operatorId: operatorId || null,
        courierId: courierId || null
      };
    });

    let totalAdded = 0;
    const BATCH_SIZE = 2000;
    const chunks = chunkArray(formattedOrders, BATCH_SIZE);
    
    for (const chunk of chunks) {
      try {
        const result = await prisma.order.createMany({
          data: chunk,
          skipDuplicates: true
        });
        totalAdded += result.count;
      } catch (err) {
        console.error("Batch insert error:", err);
      }
    }

    console.log(`✅ Import tugadi. Qo'shildi: ${totalAdded}`);

    res.json({ 
      message: "Import yakunlandi", 
      added: totalAdded, 
      totalProcessed: orders.length,
      skipped: orders.length - totalAdded,
      newUsersCreated: newOperators.size + newCouriers.size
    });

  } catch (error) {
    console.error("CRITICAL IMPORT ERROR:", error);
    res.status(500).json({ error: "Import qilishda jiddiy xatolik: " + (error as Error).message });
  }
});

app.get('/api/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { operator: true, courier: true },
    orderBy: { createdAt: 'desc' },
    // take: 100 // <--- LIMIT OLIB TASHLANDI
  });
  res.json(orders);
});

app.delete('/api/orders', async (req, res) => {
  try {
    await prisma.order.deleteMany({});
    res.json({ message: "Barcha buyurtmalar o'chirildi" });
  } catch (error) {
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});

app.post('/api/schedule/generate', async (req, res) => {
  try {
    const { userId, startDate, endDate, pattern } = req.body; 
    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedules = [];
    let currentDate = new Date(start);
    const [workCount, offCount] = pattern.split('/').map(Number);
    let isWorkingPhase = true;
    let counter = 0;

    while (currentDate <= end) {
      let shiftType = 'OFF';
      if (isWorkingPhase) {
        shiftType = 'FULL';
        counter++;
        if (counter >= workCount) { isWorkingPhase = false; counter = 0; }
      } else {
        shiftType = 'OFF';
        counter++;
        if (counter >= offCount) { isWorkingPhase = true; counter = 0; }
      }
      schedules.push({ userId, date: new Date(currentDate), shift: shiftType as any, status: AttendanceStatus.PRESENT }); // ENUM
      currentDate.setDate(currentDate.getDate() + 1);
    }
    await prisma.workSchedule.deleteMany({ where: { userId, date: { gte: start, lte: end } } });
    await prisma.workSchedule.createMany({ data: schedules });
    res.json({ message: "Grafik yaratildi", count: schedules.length });
  } catch (error) { res.status(500).json({ error: "Grafik xatolik" }); }
});

app.get('/api/schedule/:userId', async (req, res) => {
  const { userId } = req.params;
  const schedule = await prisma.workSchedule.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  res.json(schedule);
});

app.post('/api/kpi/daily', async (req, res) => {
  try {
    const { userId, date, scriptScore, errorScore, disciplineScore, comment, bonusAmount } = req.body;
    const targetDate = new Date(date);
    
    // YANGI: Agar bu haftalik bonus bo'lsa, o'sha haftadagi boshqa bonuslarni tozalash
    if (comment === 'Haftalik bonus' && bonusAmount !== undefined) {
      // Haftaning boshini va oxirini topish
      const day = targetDate.getDay();
      const start = new Date(targetDate);
      start.setDate(targetDate.getDate() - day); // Yakshanba
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6); // Shanba
      end.setHours(23, 59, 59, 999);

      // Barcha eski bonuslarni 0 qilish (shu hafta uchun)
      await prisma.dailyKPI.updateMany({
        where: { 
          userId, 
          date: { gte: start, lte: end },
          // O'zimiz yozayotgan kundan tashqari
          NOT: { date: targetDate }
        },
        data: { bonusAmount: 0 }
      });
    }

    const updateData: any = { comment };
    if (scriptScore !== undefined) updateData.scriptScore = parseFloat(scriptScore);
    if (errorScore !== undefined) updateData.errorScore = parseFloat(errorScore);
    if (disciplineScore !== undefined) updateData.disciplineScore = parseFloat(disciplineScore);
    if (bonusAmount !== undefined) updateData.bonusAmount = parseFloat(bonusAmount);

    const kpi = await prisma.dailyKPI.upsert({
      where: { userId_date: { userId, date: targetDate } },
      update: updateData,
      create: { 
        userId, 
        date: targetDate, 
        scriptScore: parseFloat(scriptScore) || 0, 
        errorScore: parseFloat(errorScore) || 0, 
        disciplineScore: parseFloat(disciplineScore) || 0, 
        bonusAmount: parseFloat(bonusAmount) || 0,
        comment 
      }
    });
    res.json(kpi);
  } catch (error) { res.status(500).json({ error: "KPI saqlashda xatolik" }); }
});

app.post('/api/kpi/confirm', async (req, res) => {
  try {
    const { userId, week } = req.body; 
    const range = getWeekRange(week);
    
    console.log(`Confirming KPI for ${userId}, Week: ${week}`); // DEBUG

    // 1. KPI ni tasdiqlash
    await prisma.dailyKPI.updateMany({
      where: { userId, date: { gte: range.start, lte: range.end } },
      data: { isConfirmed: true }
    });

    // 2. To'lov borligini tekshirish (DUBLIKATNI OLDINI OLISH)
    const existingPayment = await prisma.payment.findFirst({
      where: { userId, period: week, frequency: 'WEEKLY' }
    });

    if (existingPayment) {
      console.log("Payment already exists, skipping creation."); // DEBUG
      return res.json({ message: "Bu hafta uchun to'lov allaqachon mavjud" });
    }

    // 3. Hisoblash
    const orders = await prisma.order.findMany({
      where: { courierId: userId, createdAt: { gte: range.start, lte: range.end }, status: 'DELIVERED' }
    });
    
    const dailyKPIs = await prisma.dailyKPI.findMany({
      where: { userId, date: { gte: range.start, lte: range.end } }
    });

    let totalAmount = 0;
    orders.forEach(o => {
      totalAmount += Number(o.deliveryPrice);
      if (o.deliveryTimeSeconds && o.deliveryTimeSeconds < 1800) totalAmount += 1000;
      if (Number(o.deliveryPrice) === 8000 || Number(o.deliveryPrice) === 10000) {
        totalAmount += 1000; 
      }
    });
    
    dailyKPIs.forEach(k => {
      totalAmount += Number(k.bonusAmount);
    });

    if (totalAmount > 0) {
      await prisma.payment.create({
        data: {
          userId,
          amount: totalAmount,
          frequency: 'WEEKLY',
          period: week,
          status: 'PENDING',
          feedbackCompleted: false 
        }
      });
      console.log(`Payment created: ${totalAmount}`); // DEBUG

      // TELEGRAM NOTIFICATION (YANGI)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.telegramId) {
        const message = `🎉 <b>Haftalik KPI Tasdiqlandi!</b>\n\nSizning ${week}-hafta uchun hisobotingiz tasdiqlandi.\nJami summa: <b>${totalAmount.toLocaleString()} UZS</b>\n\nIltimos, operatorlarni baholang, shunda to'lovni olishingiz mumkin.`;
        await sendTelegramMessage(user.telegramId, message);
      }

      res.json({ message: "Tasdiqlandi va to'lovga yuborildi" });
    } else {
      console.log("Total amount is 0, skipping payment creation."); // DEBUG
      res.json({ message: "Tasdiqlandi (To'lov summasi 0)" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Tasdiqlashda xatolik" });
  }
});

// YANGI: Barchasini tasdiqlash (SAFE LOOP)
app.post('/api/kpi/confirm-all', async (req, res) => {
  try {
    const { week, role } = req.body; // role: 'COURIER' or 'OPERATOR'
    const range = getWeekRange(week);

    console.log(`Confirm All: Week ${week}, Role ${role}, Range: ${range.start} - ${range.end}`); // DEBUG

    // 1. Shu roldagi barcha xodimlarni topish
    const users = await prisma.user.findMany({
      where: { role: role, status: 'ACTIVE' }
    });

    let confirmedCount = 0;

    for (const user of users) {
      try {
        // Har bir xodim uchun tasdiqlash logikasini takrorlaymiz
        
        // KPI ni tasdiqlash
        await prisma.dailyKPI.updateMany({
          where: { userId: user.id, date: { gte: range.start, lte: range.end } },
          data: { isConfirmed: true }
        });

        // Buyurtmalarni hisoblash
        const orders = await prisma.order.findMany({
          where: { 
            [role === 'COURIER' ? 'courierId' : 'operatorId']: user.id, 
            createdAt: { gte: range.start, lte: range.end }, 
            status: 'DELIVERED' 
          }
        });
        
        const dailyKPIs = await prisma.dailyKPI.findMany({
          where: { userId: user.id, date: { gte: range.start, lte: range.end } }
        });

        let totalAmount = 0;
        
        if (role === 'COURIER') {
          orders.forEach(o => {
            totalAmount += Number(o.deliveryPrice);
            if (o.deliveryTimeSeconds && o.deliveryTimeSeconds < 1800) totalAmount += 1000;
            if (Number(o.deliveryPrice) === 8000 || Number(o.deliveryPrice) === 10000) {
              totalAmount += 1000; 
            }
          });
        } else {
          // Operator uchun hisoblash (agar kerak bo'lsa)
        }
        
        dailyKPIs.forEach(k => {
          totalAmount += Number(k.bonusAmount);
        });

        if (totalAmount > 0) {
          // To'lov yaratish (agar oldin yaratilmagan bo'lsa)
          const existingPayment = await prisma.payment.findFirst({
            where: { userId: user.id, period: week, frequency: 'WEEKLY' }
          });

          if (!existingPayment) {
            await prisma.payment.create({
              data: {
                userId: user.id,
                amount: totalAmount,
                frequency: 'WEEKLY',
                period: week,
                status: 'PENDING',
                feedbackCompleted: false
              }
            });
            confirmedCount++;
            console.log(`Payment created for ${user.fullName}: ${totalAmount}`); // DEBUG

            // Telegram xabar
            if (user.telegramId) {
              const message = `🎉 <b>Haftalik KPI Tasdiqlandi!</b>\n\nSizning ${week}-hafta uchun hisobotingiz tasdiqlandi.\nJami summa: <b>${totalAmount.toLocaleString()} UZS</b>\n\nIltimos, ${role === 'COURIER' ? 'operatorlarni' : 'kuryerlarni'} baholang, shunda to'lovni olishingiz mumkin.`;
              await sendTelegramMessage(user.telegramId, message);
            }
          } else {
             console.log(`Payment already exists for ${user.fullName}`); // DEBUG
          }
        } else {
           console.log(`No amount for ${user.fullName}`); // DEBUG
        }
      } catch (innerError) {
        console.error(`Error confirming for user ${user.fullName}:`, innerError);
        // Continue to next user
      }
    }

    res.json({ message: `${confirmedCount} ta xodim tasdiqlandi` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Barchasini tasdiqlashda xatolik" });
  }
});

app.get('/api/kpi/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { month } = req.query; 

    let dateFilter = {};
    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      dateFilter = { date: { gte: startDate, lte: endDate } };
    }

    const history = await prisma.dailyKPI.findMany({
      where: { userId, ...dateFilter },
      orderBy: { date: 'desc' }
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Tarixni yuklashda xatolik" });
  }
});

app.get('/api/kpi/report/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, week, period } = req.query; 

    let startDate, endDate;

    if (period === 'weekly' && week) {
      const range = getWeekRange(String(week));
      startDate = range.start;
      endDate = range.end;
    } else if (month) {
      startDate = new Date(`${month}-01`);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    } else {
      return res.status(400).json({ error: "Davr ko'rsatilmagan" });
    }

    // DEBUG: Sana oralig'ini log qilish
    console.log(`KPI Report for ${userId}:`, startDate.toISOString(), endDate.toISOString());

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User topilmadi" });

    const dailyKPIs = await prisma.dailyKPI.findMany({ where: { userId, date: { gte: startDate, lte: endDate } } });
    
    // Payment borligini tekshirish (isConfirmed uchun)
    let isConfirmed = false;
    if (period === 'weekly' && week) {
      const payment = await prisma.payment.findFirst({
        where: { userId, period: String(week), frequency: 'WEEKLY' }
      });
      if (payment) isConfirmed = true;
    }

    let orderFilter: any = {
      createdAt: { gte: startDate, lte: endDate }, 
      status: 'DELIVERED',
    };

    if (user.role === 'COURIER') {
      orderFilter.courierId = userId;
    } else if (user.role === 'OPERATOR') {
      orderFilter.operatorId = userId;
      orderFilter.OR = [
        { deliveryType: 'Самовывоз' },
        { deliveryType: 'Доставка', deliveryPrice: { gt: 0 } }
      ];
    }

    const orders = await prisma.order.findMany({ where: orderFilter });
    
    // DEBUG: Topilgan buyurtmalar soni
    console.log(`Orders found: ${orders.length}`);

    if (user.role === 'COURIER') {
      let totalEarnings = 0;
      let speedBonusCount = 0;
      let specialBonusCount = 0; 
      let manualBonus = 0; 
      
      const priceStats: Record<string, number> = {};

      orders.forEach(o => {
        const price = Math.round(Number(o.deliveryPrice)); 
        totalEarnings += price;
        
        if (price > 0) {
          const key = price.toString();
          priceStats[key] = (priceStats[key] || 0) + 1;
        }
        
        if (o.deliveryTimeSeconds && o.deliveryTimeSeconds < 1800) {
          totalEarnings += 1000;
          speedBonusCount++;
        }

        // 2. YANGI: 8000 va 10000 lik buyurtmalar uchun +1000 bonus
        if (price === 8000 || price === 10000) {
          totalEarnings += 1000; 
          specialBonusCount++;
        }
      });

      dailyKPIs.forEach(k => {
        manualBonus += Number(k.bonusAmount);
      });
      
      totalEarnings += manualBonus;

      const totalOrders = orders.length;
      const avgSpeedMinutes = totalOrders > 0 
        ? (orders.reduce((sum, o) => sum + (o.deliveryTimeSeconds || 0), 0) / totalOrders) / 60 
        : 0;

      return res.json({
        period: period === 'weekly' ? 'Haftalik' : month,
        range: { start: startDate, end: endDate },
        role: 'COURIER',
        facts: {
          totalOrders,
          totalEarnings,
          speedBonusCount,
          specialBonusCount,
          manualBonus,
          avgSpeedMinutes: Math.round(avgSpeedMinutes),
          isConfirmed, // <--- Payment dan olingan
          priceStats 
        },
        finalScore: 0 
      });
    }

    let totalScriptRaw = 0, totalErrorsCount = 0, totalViolationsCount = 0, daysWithScript = 0;
    dailyKPIs.forEach(k => {
      if (k.scriptScore !== null) { totalScriptRaw += k.scriptScore; daysWithScript++; }
      if (k.errorScore !== null) totalErrorsCount += k.errorScore;
      if (k.disciplineScore !== null) totalViolationsCount += k.disciplineScore;
    });

    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.amount), 0);
    const totalTime = orders.reduce((sum, o) => sum + (o.deliveryTimeSeconds || 0), 0);

    const avgScriptRaw = daysWithScript > 0 ? totalScriptRaw / daysWithScript : 0;
    const avgCheck = totalOrders > 0 ? totalAmount / totalOrders : 0;
    const avgSpeedMinutes = totalOrders > 0 ? (totalTime / totalOrders) / 60 : 0;
    const avgErrorsPerDay = daysWithScript > 0 ? totalErrorsCount / daysWithScript : 0;

    const scores = {
      script: KPI_RULES.getScriptScore(avgScriptRaw),
      errors: KPI_RULES.getErrorScore(avgErrorsPerDay), 
      discipline: KPI_RULES.getDisciplineScore(totalViolationsCount),
      orders: KPI_RULES.getOrderCountScore(totalOrders),
      speed: KPI_RULES.getSpeedScore(avgSpeedMinutes),
      check: KPI_RULES.getCheckScore(avgCheck)
    };

    const finalScore = (scores.script * 0.30) + (scores.errors * 0.20) + (scores.discipline * 0.15) + (scores.orders * 0.125) + (scores.speed * 0.125) + (scores.check * 0.10);

    res.json({
      period: period === 'weekly' ? 'Haftalik' : month,
      range: { start: startDate, end: endDate },
      role: 'OPERATOR',
      facts: { 
        avgScriptRaw: avgScriptRaw.toFixed(2), 
        avgErrorsPerDay: avgErrorsPerDay.toFixed(1), 
        totalViolations: totalViolationsCount, 
        totalOrders, 
        avgSpeedMinutes: Math.round(avgSpeedMinutes), 
        avgCheck: Math.round(avgCheck) 
      },
      scores,
      finalScore: finalScore.toFixed(2)
    });
  } catch (error) { res.status(500).json({ error: "Hisobotda xatolik" }); }
});

// ---------------------------------------------------------
// PAYMENTS (YANGI)
// ---------------------------------------------------------

// Barcha to'lovlarni olish (Filtr bilan)
app.get('/api/payments', async (req, res) => {
  const { status } = req.query;
  
  const where: any = {};
  if (status) where.status = status;

  const payments = await prisma.payment.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(payments);
});

// To'lovni amalga oshirish (PAID)
app.post('/api/payments/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    
    // To'lovni topish
    const payment = await prisma.payment.findUnique({ where: { id }, include: { user: true } });
    if (!payment) return res.status(404).json({ error: "To'lov topilmadi" });

    // YANGI: Feedback tekshiruvi
    if (!payment.feedbackCompleted) {
      return res.status(400).json({ error: "Xodim baholashni yakunlamagan. To'lov bloklangan." });
    }
    
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: { 
        status: 'PAID',
        processedAt: new Date()
      },
      include: { user: true }
    });

    // TELEGRAM NOTIFICATION (YANGI)
    if (updatedPayment.user && updatedPayment.user.telegramId) {
      const message = `✅ <b>To'lov Amalga Oshirildi!</b>\n\nSizga <b>${Number(updatedPayment.amount).toLocaleString()} UZS</b> to'lab berildi.\nDavr: ${updatedPayment.period}`;
      await sendTelegramMessage(updatedPayment.user.telegramId, message);
    }

    res.json({ message: "To'lov amalga oshirildi" });
  } catch (error) {
    res.status(500).json({ error: "To'lovda xatolik" });
  }
});

// YANGI: To'lovni bekor qilish (CANCEL)
app.post('/api/payments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // To'lovni topish
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: "To'lov topilmadi" });

    // To'lovni o'chirish (yoki statusini o'zgartirish)
    // Biz o'chirishni tanlaymiz, shunda qayta tasdiqlash mumkin bo'ladi
    await prisma.payment.delete({ where: { id } });

    // KPI ni qayta ochish (isConfirmed = false)
    // Buning uchun payment.period (week) va payment.userId kerak
    const range = getWeekRange(payment.period);
    
    await prisma.dailyKPI.updateMany({
      where: { 
        userId: payment.userId, 
        date: { gte: range.start, lte: range.end } 
      },
      data: { isConfirmed: false }
    });

    res.json({ message: "To'lov bekor qilindi va KPI qayta ochildi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Bekor qilishda xatolik" });
  }
});

// YANGI: Barcha to'lovlarni tozalash (RESET ALL)
app.post('/api/payments/reset-all', async (req, res) => {
  try {
    // 1. Barcha to'lovlarni o'chirish
    await prisma.payment.deleteMany({});

    // 2. Barcha KPI larni tasdiqlanmagan qilish
    await prisma.dailyKPI.updateMany({
      data: { isConfirmed: false }
    });

    res.json({ message: "Barcha to'lovlar tozalandi va KPI lar ochildi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Tozalashda xatolik" });
  }
});

// YANGI: Kutilayotgan baholashlarni olish
app.get('/api/payments/pending-feedback/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pendingPayments = await prisma.payment.findMany({
      where: { 
        userId, 
        status: 'PENDING', 
        feedbackCompleted: false 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingPayments);
  } catch (error) {
    res.status(500).json({ error: "Ma'lumotlarni yuklashda xatolik" });
  }
});

// SKRIPTLAR (YANGI)
app.get('/api/scripts', async (req, res) => {
  try {
    const scripts = await prisma.script.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(scripts);
  } catch (error) { 
    console.error("Skriptlarni yuklashda xatolik:", error); // DEBUG
    res.status(500).json({ error: "Skriptlarni yuklashda xatolik: " + (error as Error).message }); 
  }
});

app.post('/api/scripts', async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    console.log("Creating script:", { title, content, category, tags }); // DEBUG

    // YANGI: Agar massiv kelsa, createMany ishlatamiz
    if (Array.isArray(req.body)) {
       const count = await prisma.script.createMany({
         data: req.body
       });
       return res.json({ count });
    }

    const script = await prisma.script.create({
      data: { title, content, category, tags }
    });
    res.json(script);
  } catch (error) { 
    console.error("Script create error:", error); // DEBUG
    res.status(500).json({ error: "Skript yaratishda xatolik: " + (error as Error).message }); 
  }
});

app.put('/api/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags } = req.body;
    console.log("Updating script:", id, { title, content, category, tags }); // DEBUG

    const script = await prisma.script.update({
      where: { id },
      data: { title, content, category, tags }
    });
    res.json(script);
  } catch (error) { 
    console.error("Script update error:", error); // DEBUG
    res.status(500).json({ error: "Skript yangilashda xatolik: " + (error as Error).message }); 
  }
});

app.delete('/api/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.script.delete({ where: { id } });
    res.json({ message: "Skript o'chirildi" });
  } catch (error) { res.status(500).json({ error: "Skript o'chirishda xatolik" }); }
});

app.listen(PORT, async () => {
  console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
  await initDefaultAdmin();
});
