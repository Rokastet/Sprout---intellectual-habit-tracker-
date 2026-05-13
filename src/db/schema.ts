import { pgTable, serial, text, integer, timestamp, boolean, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  freezesCount: integer('freezes_count').default(3),
  theme: text('theme').default('light'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const habits = pgTable('habits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  frequency: text('frequency').default('daily'),
  category: text('category'),
  level: integer('level').default(1),
  targetStreak: integer('target_streak').default(7),
  isAdapted: boolean('is_adapted').default(false),
  reminderTime: text('reminder_time'),
  reminderDays: text('reminder_days'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  habitId: integer('habit_id').references(() => habits.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: text('date').notNull(),
  completed: boolean('completed').default(false),
  isFreeze: boolean('is_freeze').default(false),
  notes: text('notes'),
  mood: text('mood'),
  adaptedFrom: text('adapted_from'),
});

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  habits: many(habits),
  entries: many(entries),
  achievements: many(achievements),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  entries: many(entries),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
  habit: one(habits, { fields: [entries.habitId], references: [habits.id] }),
  user: one(users, { fields: [entries.userId], references: [users.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, { fields: [achievements.userId], references: [users.id] }),
}));
