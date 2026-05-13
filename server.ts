import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'sprout_new.db');
const db = new Database(dbPath);
const JWT_SECRET = process.env.JWT_SECRET || 'sprout-secret-key-123';

// Initialize Database
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    freezes_count INTEGER DEFAULT 3,
    theme TEXT DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT DEFAULT 'daily',
    category TEXT,
    level INTEGER DEFAULT 1,
    target_streak INTEGER DEFAULT 7,
    is_adapted BOOLEAN DEFAULT 0,
    reminder_time TEXT,
    reminder_days TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0,
    is_freeze BOOLEAN DEFAULT 0,
    notes TEXT,
    mood TEXT,
    adapted_from TEXT,
    FOREIGN KEY (habit_id) REFERENCES habits(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// --- Migrations for existing tables ---
const migrate = () => {
  const tables = {
    users: [
      { name: 'freezes_count', type: 'INTEGER DEFAULT 3' },
      { name: 'theme', type: 'TEXT DEFAULT \'light\'' }
    ],
    habits: [
      { name: 'target_streak', type: 'INTEGER DEFAULT 7' },
      { name: 'reminder_time', type: 'TEXT' },
      { name: 'reminder_days', type: 'TEXT' }
    ],
    entries: [
      { name: 'is_freeze', type: 'BOOLEAN DEFAULT 0' },
      { name: 'mood', type: 'TEXT' }
    ]
  };

  for (const [table, columns] of Object.entries(tables)) {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    for (const col of columns) {
      if (!tableInfo.some(info => info.name === col.name)) {
        console.log(`Migrating ${table}: adding column ${col.name}`);
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  }
};

try {
  migrate();
} catch (e) {
  console.error('Migration failed:', e);
}

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
      const stmt = db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)');
      const result = stmt.run(email, hashedPassword, displayName);
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email, displayName } });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes('UNIQUE') ? 'Email already exists' : 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user = db.prepare('SELECT id, email, display_name, freezes_count, theme FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  app.patch('/api/auth/settings', authenticateToken, (req: any, res) => {
    const { theme } = req.body;
    db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.id);
    res.json({ success: true });
  });

  // --- Habit Routes ---
  app.get('/api/habits', authenticateToken, (req: any, res) => {
    const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(req.user.id);
    res.json(habits);
  });

  app.post('/api/habits', authenticateToken, (req: any, res) => {
    const { name, description, frequency, category, target_streak, reminder_time, reminder_days } = req.body;
    const stmt = db.prepare('INSERT INTO habits (user_id, name, description, frequency, category, target_streak, reminder_time, reminder_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(req.user.id, name, description, frequency, category, target_streak || 7, reminder_time, reminder_days);
    res.json({ id: result.lastInsertRowid, name, description, frequency, category, target_streak: target_streak || 7, reminder_time, reminder_days });
  });

  app.patch('/api/habits/:id', authenticateToken, (req: any, res) => {
    const { name, description, level, is_adapted, target_streak, reminder_time, reminder_days } = req.body;
    const stmt = db.prepare(`
      UPDATE habits 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description),
          level = COALESCE(?, level),
          is_adapted = COALESCE(?, is_adapted),
          target_streak = COALESCE(?, target_streak),
          reminder_time = COALESCE(?, reminder_time),
          reminder_days = COALESCE(?, reminder_days)
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(name, description, level, is_adapted ? 1 : 0, target_streak, reminder_time, reminder_days, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete('/api/habits/:id', authenticateToken, (req: any, res) => {
    const habitId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    try {
      const deleteEntries = db.prepare('DELETE FROM entries WHERE habit_id = ? AND user_id = ?');
      const deleteHabit = db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?');
      
      const transaction = db.transaction(() => {
        deleteEntries.run(habitId, userId);
        deleteHabit.run(habitId, userId);
      });
      
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/entries/:id', authenticateToken, (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    const { completed, notes, is_freeze } = req.body;
    
    // Check if it was a freeze to handle refund/charge
    const existing = db.prepare('SELECT is_freeze FROM entries WHERE id = ? AND user_id = ?').get(entryId, userId) as any;
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    if (is_freeze !== undefined && is_freeze !== (existing.is_freeze === 1)) {
      if (is_freeze) {
        // Changing to freeze
        const user = db.prepare('SELECT freezes_count FROM users WHERE id = ?').get(userId) as any;
        if (user.freezes_count <= 0) return res.status(400).json({ error: 'No freezes left' });
        db.prepare('UPDATE users SET freezes_count = freezes_count - 1 WHERE id = ?').run(userId);
      } else {
        // Changing from freeze to normal
        db.prepare('UPDATE users SET freezes_count = freezes_count + 1 WHERE id = ?').run(userId);
      }
    }

    const stmt = db.prepare(`
      UPDATE entries 
      SET completed = COALESCE(?, completed),
          notes = COALESCE(?, notes),
          is_freeze = COALESCE(?, is_freeze),
          mood = COALESCE(?, mood)
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      completed !== undefined ? (completed ? 1 : 0) : null,
      notes !== undefined ? notes : null,
      is_freeze !== undefined ? (is_freeze ? 1 : 0) : null,
      req.body.mood !== undefined ? req.body.mood : null,
      entryId,
      userId
    );
    res.json({ success: true });
  });

  app.delete('/api/entries/:id', authenticateToken, (req: any, res: any) => {
    const entryId = Number(req.params.id);
    const userId = Number(req.user.id);
    
    const entry = db.prepare('SELECT is_freeze FROM entries WHERE id = ? AND user_id = ?').get(entryId, userId) as any;
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    if (entry.is_freeze) {
      db.prepare('UPDATE users SET freezes_count = freezes_count + 1 WHERE id = ?').run(userId);
    }

    db.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(entryId, userId);
    res.json({ success: true });
  });

  app.get('/api/entries', authenticateToken, (req: any, res) => {
    const entries = db.prepare('SELECT * FROM entries WHERE user_id = ?').all(req.user.id);
    res.json(entries);
  });

  app.get('/api/stats', authenticateToken, (req: any, res) => {
    const totalCompleted = db.prepare('SELECT COUNT(*) as count FROM entries WHERE user_id = ? AND completed = 1').get(req.user.id) as any;
    const habitsCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(req.user.id) as any;
    const last7DaysData = db.prepare(`SELECT date, COUNT(*) as count FROM entries WHERE user_id = ? AND completed = 1 AND date >= date('now', '-7 days') GROUP BY date ORDER BY date ASC`).all(req.user.id);

    res.json({
      totalCompleted: totalCompleted.count,
      activeHabits: habitsCount.count,
      dailyStats: last7DaysData
    });
  });

  app.get('/api/achievements', authenticateToken, (req: any, res) => {
    const userAchievements = db.prepare('SELECT * FROM achievements WHERE user_id = ?').all(req.user.id);
    res.json(userAchievements);
  });

  app.post('/api/entries', authenticateToken, (req: any, res: any) => {
    const { habit_id, date, completed, notes, adapted_from, is_freeze, mood } = req.body;
    
    if (is_freeze) {
      const user = db.prepare('SELECT freezes_count FROM users WHERE id = ?').get(req.user.id) as any;
      if (user.freezes_count <= 0) return res.status(400).json({ error: 'No freezes left' });
      
      db.prepare('UPDATE users SET freezes_count = freezes_count - 1 WHERE id = ?').run(req.user.id);
    }

    const stmt = db.prepare('INSERT INTO entries (habit_id, user_id, date, completed, is_freeze, notes, mood, adapted_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(habit_id, req.user.id, date, completed ? 1 : 0, is_freeze ? 1 : 0, notes, mood, adapted_from);

    // Achievement: First entry
    const entryCountValue = db.prepare('SELECT COUNT(*) as count FROM entries WHERE user_id = ?').get(req.user.id) as any;
    
    const checkAchievement = (type: string) => {
      const existingAch = db.prepare('SELECT * FROM achievements WHERE user_id = ? AND type = ?').get(req.user.id, type);
      if (!existingAch) {
        db.prepare('INSERT INTO achievements (user_id, type) VALUES (?, ?)').run(req.user.id, type);
      }
    };

    if (entryCountValue.count >= 1) checkAchievement('FIRST_STEP');
    if (entryCountValue.count >= 10) checkAchievement('TEN_STEPS');
    if (is_freeze) checkAchievement('ICE_AGE');

    // More achievements
    const hour = new Date().getHours();
    if (hour < 8) checkAchievement('EARLY_BIRD');

    const habitCount = db.prepare('SELECT COUNT(*) as count FROM habits WHERE user_id = ?').get(req.user.id) as any;
    if (habitCount.count >= 5) checkAchievement('HABIT_MASTER');

    // Advanced streak check for 7 days
    const last7Entries = db.prepare(`
      SELECT date FROM entries 
      WHERE habit_id = ? AND (completed = 1 OR is_freeze = 1) 
      ORDER BY date DESC 
      LIMIT 7
    `).all(habit_id) as any[];

    if (last7Entries.length === 7) {
      // Check if dates are consecutive (simple version)
      const isConsecutive = last7Entries.every((entry, index) => {
        if (index === 0) return true;
        const prevDate = new Date(last7Entries[index - 1].date);
        const currDate = new Date(entry.date);
        const diff = (prevDate.getTime() - currDate.getTime()) / (1000 * 3600 * 24);
        return diff === 1;
      });
      if (isConsecutive) checkAchievement('STREAK_7');
    }

    res.json({ id: result.lastInsertRowid });
  });

  app.delete('/api/entries', authenticateToken, (req: any, res: any) => {
    const habit_id = req.body.habit_id || req.query.habit_id;
    const date = req.body.date || req.query.date;
    const userId = req.user.id;

    if (!habit_id || !date) {
      return res.status(400).json({ error: 'Missing habit_id or date' });
    }
    
    // Check if it was a freeze to refund it
    const entry = db.prepare('SELECT is_freeze FROM entries WHERE habit_id = ? AND date = ? AND user_id = ?').get(habit_id, date, userId) as any;
    
    if (entry && entry.is_freeze) {
      db.prepare('UPDATE users SET freezes_count = freezes_count + 1 WHERE id = ?').run(userId);
    }

    db.prepare('DELETE FROM entries WHERE habit_id = ? AND date = ? AND user_id = ?').run(habit_id, date, userId);
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

startServer();
