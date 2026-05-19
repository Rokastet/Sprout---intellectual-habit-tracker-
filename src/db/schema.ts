import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  freezesCount: integer('freezes_count').default(3),
  theme: text('theme').default('light'),
  lastFreezesReplenishedAt: text('last_freezes_replenished_at').default(new Date().toISOString()),
  createdAt: text('created_at').default(new Date().toISOString()),
});

export const habits = sqliteTable('habits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  frequency: text('frequency').default('daily'),
  category: text('category'),
  level: integer('level').default(1),
  targetStreak: integer('target_streak').default(7),
  isAdapted: integer('is_adapted', { mode: 'boolean' }).default(false),
  reminderTime: text('reminder_time'),
  reminderDays: text('reminder_days'),
  createdAt: text('created_at').default(new Date().toISOString()),
});

export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  habitId: integer('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: text('date').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  isFreeze: integer('is_freeze', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  mood: text('mood'),
  adaptedFrom: text('adapted_from'),
});

export const achievements = sqliteTable('achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  unlockedAt: text('unlocked_at').default(new Date().toISOString()),
});
