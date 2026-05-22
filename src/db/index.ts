import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.ts';
import path from 'path';

const sqlite = new Database('/tmp/sprout.db');
sqlite.pragma('journal_mode = WAL');

// Programmatic schema initialization (guarantees tables exist without index collision)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    freezes_count INTEGER DEFAULT 3,
    theme TEXT DEFAULT 'light',
    last_freezes_replenished_at TEXT,
    created_at TEXT
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
    is_adapted INTEGER DEFAULT 0,
    reminder_time TEXT,
    reminder_days TEXT,
    created_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    is_freeze INTEGER DEFAULT 0,
    notes TEXT,
    mood TEXT,
    adapted_from TEXT,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export const db = drizzle(sqlite, { schema });
