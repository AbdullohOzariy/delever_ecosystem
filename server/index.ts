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
    throw error;
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
    
    await prisma.dailyKPI.updateMany({
      where: { userId, date: { gte: range.start, lte: range.end } },
      data: { isConfirmed: true }
    });

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

    await prisma.payment.create({
      data: {
        userId,
        amount: totalAmount,
        frequency: 'WEEKLY',
        period: week,
        status: 'PENDING',
        feedbackCompleted: false // Boshlanishida false
      }
    });

    // TELEGRAM NOTIFICATION (YANGI)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.telegramId) {
      const message = `🎉 <b>Haftalik KPI Tasdiqlandi!</b>\n\nSizning ${week}-hafta uchun hisobotingiz tasdiqlandi.\nJami summa: <b>${totalAmount.toLocaleString()} UZS</b>\n\nIltimos, operatorlarni baholang, shunda to'lovni olishingiz mumkin.`;
      await sendTelegramMessage(user.telegramId, message);
    }

    res.json({ message: "Tasdiqlandi va to'lovga yuborildi" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Tasdiqlashda xatolik" });
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

// YANGI: Haftalik hisobot logikasi (Yakshanba - Shanba)
const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay(); 
  
  const start = new Date(date);
  start.setDate(date.getDate() - day); 
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); 
  end.setHours(23, 59, 59, 999);

  console.log(`Week Range for ${dateStr}:`, start.toISOString(), end.toISOString()); // DEBUG
  return { start, end };
};

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
      let isConfirmed = false;
      
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
        if (k.isConfirmed) isConfirmed = true;
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
          isConfirmed,
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

// ---------------------------------------------------------
// ADMIN CHECKLIST (YANGI)
// ---------------------------------------------------------
app.get('/api/admin/checklist', async (req, res) => {
  try {
    const tasks = [];
    const today = new Date();
    
    // 1. Kunlik Operator Baholash (Oxirgi 3 kun)
    const activeOperators = await prisma.user.count({ where: { role: 'OPERATOR', status: 'ACTIVE' } });
    
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      
      const kpiCount = await prisma.dailyKPI.count({
        where: { date: d, scriptScore: { not: null } } // Faqat operator KPI lari
      });

      if (kpiCount < activeOperators) {
        tasks.push({
          id: `daily-${dateStr}`,
          title: `${dateStr}: Operatorlarni baholash`,
          type: 'DAILY',
          status: 'PENDING',
          date: dateStr,
          action: 'admin_kpi'
        });
      }
    }

    // 2. Haftalik Kuryer Tasdiqlash (Oxirgi 2 hafta)
    // Har yakshanba kuni o'tgan haftani tekshiramiz
    // Hozircha oddiyroq: Oxirgi 2 ta dushanbani olib, o'sha hafta tasdiqlanganmi yo'qmi tekshiramiz
    
    const currentDay = today.getDay(); // 0-6
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMonday);
    
    // O'tgan hafta dushanbasi
    const prevMonday = new Date(lastMonday);
    prevMonday.setDate(lastMonday.getDate() - 7);
    
    const weeksToCheck = [prevMonday]; // Faqat o'tgan haftani tekshiramiz (joriy hafta tugamagan)

    for (const monday of weeksToCheck) {
      const dateStr = monday.toISOString().slice(0, 10);
      const range = getWeekRange(dateStr);
      
      // Shu hafta uchun to'lov bormi?
      const paymentCount = await prisma.payment.count({
        where: { 
          period: dateStr, // Biz periodga week dateStr yozamiz
          frequency: 'WEEKLY'
        }
      });

      // Agar to'lov yo'q bo'lsa -> Tasdiqlash kerak
      // Lekin avval buyurtma borligini tekshiramiz
      const orderCount = await prisma.order.count({
        where: { createdAt: { gte: range.start, lte: range.end }, status: 'DELIVERED' }
      });

      if (paymentCount === 0 && orderCount > 0) {
        tasks.push({
          id: `weekly-${dateStr}`,
          title: `${dateStr} haftasi: Kuryerlarni tasdiqlash`,
          type: 'WEEKLY',
          status: 'PENDING',
          date: dateStr,
          action: 'kpi_reports'
        });
      } else if (orderCount === 0) {
         tasks.push({
          id: `upload-${dateStr}`,
          title: `${dateStr} haftasi: CSV Yuklash`,
          type: 'UPLOAD',
          status: 'PENDING',
          date: dateStr,
          action: 'master_data'
        });
      }
    }

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Checklist xatolik" });
  }
});

// ---------------------------------------------------------
// RATINGS (YANGI)
// ---------------------------------------------------------
app.get('/api/operators', async (req, res) => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR', status: 'ACTIVE' },
      select: { id: true, fullName: true }
    });
    res.json(operators);
  } catch (error) {
    res.status(500).json({ error: "Operatorlarni yuklashda xatolik" });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { fromUserId, toUserId, score, comment, week } = req.body; // week qo'shildi
    
    // Haftaning boshlanish sanasini aniqlash
    const monday = getWeekStartFromWeekString(week); // YYYY-Www dan Dushanba sanasini oladi
    const date = new Date(monday); // Baholash sanasi sifatida haftaning boshini olamiz

    const rating = await prisma.rating.upsert({
      where: {
        fromUserId_toUserId_date: {
          fromUserId,
          toUserId,
          date: date
        }
      },
      update: { score, comment },
      create: { fromUserId, toUserId, score, comment, date: date }
    });

    // YANGI: Agar kuryer baholagan bo'lsa, uning PENDING to'lovini yangilash
    // Kuryer o'sha hafta uchun barcha operatorlarni baholaganmi tekshiramiz
    const activeOperators = await prisma.user.findMany({
      where: { role: 'OPERATOR', status: 'ACTIVE' },
      select: { id: true }
    });
    const activeOperatorIds = activeOperators.map(op => op.id);

    const ratedOperatorsCount = await prisma.rating.count({
      where: {
        fromUserId: fromUserId,
        date: date,
        toUserId: { in: activeOperatorIds }
      }
    });

    // Agar barcha operatorlar baholangan bo'lsa
    if (ratedOperatorsCount >= activeOperatorIds.length) { // Yoki kamida 3 ta bo'lsa
      const pendingPayment = await prisma.payment.findFirst({
        where: { userId: fromUserId, status: 'PENDING', period: week }, // O'sha hafta uchun
        orderBy: { createdAt: 'desc' }
      });

      if (pendingPayment) {
        await prisma.payment.update({
          where: { id: pendingPayment.id },
          data: { feedbackCompleted: true }
        });
      }
    }

    res.json({ message: "Baholash saqlandi", rating });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Baholashda xatolik" });
  }
});

// Kuryerning o'sha hafta uchun baholarini olish
app.get('/api/ratings/courier/:fromUserId/:week', async (req, res) => {
  try {
    const { fromUserId, week } = req.params;
    const monday = getWeekStartFromWeekString(week);
    const date = new Date(monday);

    const ratings = await prisma.rating.findMany({
      where: { fromUserId, date: date },
      include: { toUser: { select: { id: true, fullName: true } } }
    });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: "Kuryer baholarini yuklashda xatolik" });
  }
});

// Admin uchun barcha baholarni olish
app.get('/api/ratings/all', async (req, res) => {
  try {
    const ratings = await prisma.rating.findMany({
      include: {
        fromUser: { select: { id: true, fullName: true, role: true } },
        toUser: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ error: "Barcha baholarni yuklashda xatolik" });
  }
});

// YYYY-Www formatidan haftaning Dushanba sanasini olish
function getWeekStartFromWeekString(weekString: string) {
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


app.listen(PORT, async () => {
  console.log(`🚀 Server ${PORT}-portda ishga tushdi`);
  await initDefaultAdmin();
});
