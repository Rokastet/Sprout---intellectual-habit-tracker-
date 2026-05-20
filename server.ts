import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const JWT_SECRET = process.env.JWT_SECRET || 'sprout-secret-key-123';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  const replenishFreezesIfNeeded = async (userId: number) => {
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!user) return;

      const now = new Date();
      const lastReplenished = user.lastFreezesReplenishedAt ? new Date(user.lastFreezesReplenishedAt) : new Date(user.createdAt || now);
      
      const diffTime = now.getTime() - lastReplenished.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays >= 7) {
        console.log(`Weekly freeze replenishment check for user ${userId}`);
        const updateData: any = { lastFreezesReplenishedAt: now.toISOString() };
        if ((user.freezesCount || 0) < 3) {
          updateData.freezesCount = 3;
          console.log(`Replenished freezes to 3 for user ${userId}`);
        }
        await db.update(schema.users).set(updateData).where(eq(schema.users.id, userId));
      }
    } catch (error) {
      console.error('Error in replenishFreezesIfNeeded:', error);
    }
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email: rawEmail, password, displayName } = req.body;
    const email = rawEmail?.toLowerCase().trim();
    try {
      console.log(`Registering user: ${email}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(schema.users).values({
        email,
        passwordHash: hashedPassword,
        displayName,
      }).returning();
      
      const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET);
      res.json({ token, user: { 
        id: newUser.id, 
        email: newUser.email, 
        displayName: newUser.displayName, 
        freezesCount: newUser.freezesCount,
        theme: newUser.theme
      } });
    } catch (error: any) {
      console.error('Registration error details:', error);
      res.status(400).json({ error: error.message.includes('UNIQUE') || error.message.includes('unique') ? 'Email already exists' : `Registration failed: ${error.message}` });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase().trim();
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await replenishFreezesIfNeeded(user.id);
      
      // Fetch user again to get updated freezesCount if it was replenished
      const [updatedUser] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);

      const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email }, JWT_SECRET);
      res.json({ token, user: { 
        id: updatedUser.id, 
        email: updatedUser.email, 
        displayName: updatedUser.displayName, 
        freezesCount: updatedUser.freezesCount,
        theme: updatedUser.theme
      } });
    } catch (error: any) {
      console.error('Login error details:', error);
      res.status(500).json({ error: `Login failed: ${error.message}` });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      await replenishFreezesIfNeeded(req.user.id);

      const [user] = await db.select({
        id: schema.users.id,
        email: schema.users.email,
        displayName: schema.users.displayName,
        freezesCount: schema.users.freezesCount,
        theme: schema.users.theme,
      }).from(schema.users).where(eq(schema.users.id, req.user.id)).limit(1);
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/auth/settings', authenticateToken, async (req: any, res) => {
    const { theme } = req.body;
    await db.update(schema.users).set({ theme }).where(eq(schema.users.id, req.user.id));
    res.json({ success: true });
  });

  // --- Habit Routes ---
  app.get('/api/habits', authenticateToken, async (req: any, res) => {
    const habitsList = await db.select().from(schema.habits).where(eq(schema.habits.userId, req.user.id));
    res.json(habitsList);
  });

  app.post('/api/habits', authenticateToken, async (req: any, res) => {
    const { name, description, frequency, category, targetStreak, reminderTime, reminderDays } = req.body;
    const [newHabit] = await db.insert(schema.habits).values({
      userId: req.user.id,
      name,
      description,
      frequency,
      category,
      targetStreak: targetStreak || 7,
      reminderTime: reminderTime,
      reminderDays: reminderDays,
    }).returning();
    
    res.json(newHabit);
  });

  app.patch('/api/habits/:id', authenticateToken, async (req: any, res) => {
    const { name, description, level, isAdapted, targetStreak, reminderTime, reminderDays, category } = req.body;
    await db.update(schema.habits).set({
      name,
      description,
      level,
      isAdapted: isAdapted,
      targetStreak: targetStreak,
      reminderTime: reminderTime,
      reminderDays: reminderDays,
      category,
    }).where(and(eq(schema.habits.id, Number(req.params.id)), eq(schema.habits.userId, req.user.id)));
    
    res.json({ success: true });
  });

  app.delete('/api/habits/:id', authenticateToken, async (req: any, res) => {
    const habitId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    try {
      db.transaction((tx) => {
        tx.delete(schema.entries).where(and(eq(schema.entries.habitId, habitId), eq(schema.entries.userId, userId))).run();
        tx.delete(schema.habits).where(and(eq(schema.habits.id, habitId), eq(schema.habits.userId, userId))).run();
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/entries/:id', authenticateToken, async (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    const { completed, notes, isFreeze, mood } = req.body;
    
    const [existing] = await db.select().from(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId))).limit(1);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    if (isFreeze !== undefined && isFreeze !== existing.isFreeze) {
      db.transaction((tx) => {
        if (isFreeze) {
          const [user]: any = tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
          if ((user.freezesCount || 0) <= 0) throw new Error('No freezes left');
          tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) - 1 }).where(eq(schema.users.id, userId)).run();
        } else {
          const [user]: any = tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
          tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId)).run();
        }
      });
    }

    await db.update(schema.entries).set({
      completed,
      notes,
      isFreeze: isFreeze,
      mood,
    }).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId)));
    
    res.json({ success: true });
  });

  app.delete('/api/entries/:id', authenticateToken, async (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    const [entry] = await db.select().from(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId))).limit(1);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    db.transaction((tx) => {
      if (entry.isFreeze) {
        const [user]: any = tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
        tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId)).run();
      }
      tx.delete(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId))).run();
    });
    
    res.json({ success: true });
  });

  app.get('/api/entries', authenticateToken, async (req: any, res) => {
    const entriesList = await db.select().from(schema.entries).where(eq(schema.entries.userId, req.user.id));
    res.json(entriesList);
  });

  app.get('/api/stats', authenticateToken, async (req: any, res) => {
    const [totalCompleted] = await db.select({ count: count() }).from(schema.entries).where(and(eq(schema.entries.userId, req.user.id), eq(schema.entries.completed, true)));
    const [habitsCount] = await db.select({ count: count() }).from(schema.habits).where(eq(schema.habits.userId, req.user.id));
    
    // Simple 7 day stats
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const last7DaysData = await db.select({ 
      date: schema.entries.date, 
      count: count() 
    }).from(schema.entries)
      .where(and(
        eq(schema.entries.userId, req.user.id), 
        eq(schema.entries.completed, true),
        gte(schema.entries.date, sevenDaysAgoStr)
      ))
      .groupBy(schema.entries.date)
      .orderBy(schema.entries.date);

    res.json({
      totalCompleted: totalCompleted.count,
      activeHabits: habitsCount.count,
      dailyStats: last7DaysData
    });
  });

  app.post('/api/ai/adapt', authenticateToken, async (req: any, res: any) => {
    const { name, description, completionRate, mood, missReason } = req.body;
    
    const prompt = `
      The user is trying to form the habit: "${name}" (${description || ''}).
      
      Context:
      - Miss reason: ${missReason || 'Not specified'}
      - Current mood: ${mood || 'Not specified'}
      - Recent completion rate: ${completionRate ? (completionRate * 100).toFixed(0) + '%' : 'Unknown'}
      
      Act as a supportive, gentle psychological coach.
      
      If their completion rate is low, suggest a "Micro-version" that takes less than 2 minutes.
      If their mood is low, suggest something more restorative.
      If they are doing well but feeling overwhelmed, suggest a slight simplification to prevent burnout.
      
      The goal is to maintain the streak without the pressure of the full task.
      
      Respond in JSON format:
      {
        "name": "The adjusted habit name",
        "description": "Short description of what to do",
        "reason": "A supportive message in Russian explaining why this helps based on their mood/performance"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["name", "description", "reason"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json({
        name: data.name || name,
        description: data.description || description,
        reason: data.reason || "Каждое маленькое усилие сегодня поможет завтра."
      });
    } catch (error: any) {
      console.error("Gemini adaptation error:", error);
      res.json({
        name,
        description,
        reason: "Даже небольшое усилие сегодня поможет завтра."
      });
    }
  });

  app.post('/api/ai/breakdown', authenticateToken, async (req: any, res: any) => {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ error: "Goal is required" });
    }

    const prompt = `
      User goal: "${goal}".
      Break this into 3 levels of habits:
      1. Level 1: Micro-habit (takes 2 minutes)
      2. Level 2: Regular habit (takes 15-30 minutes)
      3. Level 3: Advanced habit (full practice)
      
      Respond in JSON format as an array of objects with 'name', 'description', and 'reason'.
      The response must be in Russian language.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["name", "description", "reason"]
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '[]');
      res.json(parsed);
    } catch (error) {
      console.error("Gemini breakdown error:", error);
      res.json([
        { name: "Микро-версия", description: `${goal} — делать по 2 минуты в день`, reason: "Начните с малого, чтобы преодолеть прокрастинацию." },
        { name: "Обычная версия", description: `${goal} — делать по 15 минут в день`, reason: "Оптимальный уровень нагрузки для закрепления привычки." },
        { name: "Продвинутая версия", description: `${goal} — полноценное выполнение`, reason: "Максимальный результат при стабильной практике." }
      ]);
    }
  });


  app.post('/api/entries', authenticateToken, async (req: any, res: any) => {
    const { habitId, date, completed, notes, adaptedFrom, isFreeze, mood } = req.body;
    const userId = req.user.id;
    
    try {
      const result = db.transaction((tx) => {
        if (isFreeze) {
          const [user]: any = tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
          if ((user.freezesCount || 0) <= 0) throw new Error('No freezes left');
          tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) - 1 }).where(eq(schema.users.id, userId)).run();
        }

        const [newEntry]: any = tx.insert(schema.entries).values({
          habitId: habitId,
          userId: userId,
          date,
          completed: !!completed,
          isFreeze: !!isFreeze,
          notes,
          mood,
          adaptedFrom: adaptedFrom,
        }).returning().all();

        return newEntry;
      });

      res.json({ id: result.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/entries', authenticateToken, async (req: any, res: any) => {
    const habitId = Number(req.body.habitId || req.query.habitId);
    const date = String(req.body.date || req.query.date);
    const userId = Number(req.user.id);

    if (!habitId || !date) {
      return res.status(400).json({ error: 'Missing habitId or date' });
    }
    
    const [entry] = await db.select().from(schema.entries).where(and(
      eq(schema.entries.habitId, habitId), 
      eq(schema.entries.date, date), 
      eq(schema.entries.userId, userId)
    )).limit(1);
    
    if (entry) {
      db.transaction((tx) => {
        if (entry.isFreeze) {
          const [user]: any = tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
          tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId)).run();
        }
        tx.delete(schema.entries).where(and(
          eq(schema.entries.habitId, habitId), 
          eq(schema.entries.date, date), 
          eq(schema.entries.userId, userId)
        )).run();
      });
    }

    res.json({ success: true });
  });

  // --- Vite / Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Sprout running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

