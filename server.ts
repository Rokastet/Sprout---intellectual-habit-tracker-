import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle(queryClient, { schema });

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

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, displayName } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(schema.users).values({
        email,
        passwordHash: hashedPassword,
        displayName,
      }).returning();
      
      const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET);
      res.json({ token, user: { id: newUser.id, email, displayName: newUser.displayName } });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes('unique') ? 'Email already exists' : 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName } });
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    const [user] = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      freezesCount: schema.users.freezesCount,
      theme: schema.users.theme,
    }).from(schema.users).where(eq(schema.users.id, req.user.id)).limit(1);
    
    res.json(user);
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
    const { name, description, frequency, category, target_streak, reminder_time, reminder_days } = req.body;
    const [newHabit] = await db.insert(schema.habits).values({
      userId: req.user.id,
      name,
      description,
      frequency,
      category,
      targetStreak: target_streak || 7,
      reminderTime: reminder_time,
      reminderDays: reminder_days,
    }).returning();
    
    res.json(newHabit);
  });

  app.patch('/api/habits/:id', authenticateToken, async (req: any, res) => {
    const { name, description, level, is_adapted, target_streak, reminder_time, reminder_days } = req.body;
    await db.update(schema.habits).set({
      name,
      description,
      level,
      isAdapted: is_adapted,
      targetStreak: target_streak,
      reminderTime: reminder_time,
      reminderDays: reminder_days,
    }).where(and(eq(schema.habits.id, Number(req.params.id)), eq(schema.habits.userId, req.user.id)));
    
    res.json({ success: true });
  });

  app.delete('/api/habits/:id', authenticateToken, async (req: any, res) => {
    const habitId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    try {
      await db.transaction(async (tx) => {
        await tx.delete(schema.entries).where(and(eq(schema.entries.habitId, habitId), eq(schema.entries.userId, userId)));
        await tx.delete(schema.habits).where(and(eq(schema.habits.id, habitId), eq(schema.habits.userId, userId)));
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/entries/:id', authenticateToken, async (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    const { completed, notes, is_freeze, mood } = req.body;
    
    const [existing] = await db.select().from(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId))).limit(1);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    if (is_freeze !== undefined && is_freeze !== existing.isFreeze) {
      await db.transaction(async (tx) => {
        if (is_freeze) {
          const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
          if ((user.freezesCount || 0) <= 0) throw new Error('No freezes left');
          await tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) - 1 }).where(eq(schema.users.id, userId));
        } else {
          const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
          await tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId));
        }
      });
    }

    await db.update(schema.entries).set({
      completed,
      notes,
      isFreeze: is_freeze,
      mood,
    }).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId)));
    
    res.json({ success: true });
  });

  app.delete('/api/entries/:id', authenticateToken, async (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    const [entry] = await db.select().from(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId))).limit(1);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await db.transaction(async (tx) => {
      if (entry.isFreeze) {
        const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
        await tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId));
      }
      await tx.delete(schema.entries).where(and(eq(schema.entries.id, entryId), eq(schema.entries.userId, userId)));
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

  app.get('/api/achievements', authenticateToken, async (req: any, res) => {
    const userAchievements = await db.select().from(schema.achievements).where(eq(schema.achievements.userId, req.user.id));
    res.json(userAchievements);
  });

  app.post('/api/entries', authenticateToken, async (req: any, res: any) => {
    const { habit_id, date, completed, notes, adapted_from, is_freeze, mood } = req.body;
    const userId = req.user.id;
    
    try {
      const result = await db.transaction(async (tx) => {
        if (is_freeze) {
          const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
          if ((user.freezesCount || 0) <= 0) throw new Error('No freezes left');
          await tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) - 1 }).where(eq(schema.users.id, userId));
        }

        const [newEntry] = await tx.insert(schema.entries).values({
          habitId: habit_id,
          userId: userId,
          date,
          completed: !!completed,
          isFreeze: !!is_freeze,
          notes,
          mood,
          adaptedFrom: adapted_from,
        }).returning();

        // Achievement logic
        const [entryCount] = await tx.select({ count: count() }).from(schema.entries).where(eq(schema.entries.userId, userId));
        
        const checkAchievement = async (type: string) => {
          const [existing] = await tx.select().from(schema.achievements).where(and(eq(schema.achievements.userId, userId), eq(schema.achievements.type, type))).limit(1);
          if (!existing) {
            await tx.insert(schema.achievements).values({ userId, type });
          }
        };

        if (Number(entryCount.count) >= 1) await checkAchievement('FIRST_STEP');
        if (Number(entryCount.count) >= 10) await checkAchievement('TEN_STEPS');
        if (is_freeze) await checkAchievement('ICE_AGE');

        const hour = new Date().getHours();
        if (hour < 8) await checkAchievement('EARLY_BIRD');

        const [habitCount] = await tx.select({ count: count() }).from(schema.habits).where(eq(schema.habits.userId, userId));
        if (Number(habitCount.count) >= 5) await checkAchievement('HABIT_MASTER');

        return newEntry;
      });

      res.json({ id: result.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/entries', authenticateToken, async (req: any, res: any) => {
    const habit_id = Number(req.body.habit_id || req.query.habit_id);
    const date = String(req.body.date || req.query.date);
    const userId = Number(req.user.id);

    if (!habit_id || !date) {
      return res.status(400).json({ error: 'Missing habit_id or date' });
    }
    
    const [entry] = await db.select().from(schema.entries).where(and(
      eq(schema.entries.habitId, habit_id), 
      eq(schema.entries.date, date), 
      eq(schema.entries.userId, userId)
    )).limit(1);
    
    if (entry) {
      await db.transaction(async (tx) => {
        if (entry.isFreeze) {
          const [user] = await tx.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
          await tx.update(schema.users).set({ freezesCount: (user.freezesCount || 0) + 1 }).where(eq(schema.users.id, userId));
        }
        await tx.delete(schema.entries).where(and(
          eq(schema.entries.habitId, habit_id), 
          eq(schema.entries.date, date), 
          eq(schema.entries.userId, userId)
        ));
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

