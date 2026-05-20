/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, 
  LogOut, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Snowflake,
  Moon,
  Sun,
  Settings,
  Trash2,
  Edit2,
  Trash,
  History,
  Bell,
  Quote
} from 'lucide-react';
import { api, type User, type Habit, type HabitEntry } from './lib/api';
import { cn } from './lib/utils';
import { 
  format, 
  isToday, 
  startOfToday, 
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isFuture
} from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// --- Sub-components ---

export const CATEGORY_MAP: Record<string, { label: string, emoji: string, color: string, bg: string }> = {
  sport: { label: 'Спорт', emoji: '🏃‍♂️', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  health: { label: 'Здоровье', emoji: '🍏', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  mind: { label: 'Разум', emoji: '🧠', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
  work: { label: 'Работа', emoji: '💼', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  other: { label: 'Другое', emoji: '✨', color: 'text-neutral-600', bg: 'bg-neutral-50 dark:bg-neutral-850' }
};

function AuthForm({ onAuth }: { onAuth: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        onAuth(res.user);
      } else {
        const res = await api.register({ email, password, displayName });
        onAuth(res.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md sprout-card p-8 md:p-12 transition-all"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-sprout-olive/10 dark:bg-sprout-dark-border flex items-center justify-center rounded-3xl mb-4">
            <Leaf className="w-8 h-8 text-sprout-olive dark:text-white" />
          </div>
          <h1 className="text-4xl mb-2">Sprout</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-center font-light">
            Интеллектуальная забота о ваших привычках
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 ml-2">Имя</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full sprout-input" 
                placeholder="Как к вам обращаться?"
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 ml-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sprout-input" 
              placeholder="example@mail.com"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 ml-2">Пароль</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full sprout-input" 
              placeholder="••••••••"
              required 
            />
          </div>


          {error && <p className="text-red-500 text-sm ml-2">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full sprout-button mt-4"
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sprout-olive text-sm font-medium hover:underline underline-offset-4"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function HabitCard({ 
  habit, 
  entries, 
  user,
  onToggle,
  onFreeze,
  onDetails,
  onAdapt
}: { 
  habit: Habit; 
  entries: HabitEntry[]; 
  user: User;
  onToggle: (habitId: number) => Promise<void> | void;
  onFreeze: (habitId: number) => Promise<void> | void;
  onDetails: (habitId: number) => void;
  onAdapt?: (habit: Habit) => void;
}) {
  const todayDate = format(startOfToday(), 'yyyy-MM-dd');
  const todayEntry = entries.find(e => e.habitId === habit.id && e.date === todayDate);
  const isCompleted = !!todayEntry?.completed;
  const isFrozen = !!todayEntry?.isFreeze;

  const isStruggling = React.useMemo(() => {
    if (habit.isAdapted) return false;
    const hEntries = entries.filter(e => e.habitId === habit.id).sort((a,b) => b.date.localeCompare(a.date));
    const recent = hEntries.slice(0, 7);
    if (recent.length < 3) return false;
    
    const completionRate = recent.filter(e => e.completed || e.isFreeze).length / recent.length;
    const hasBadMood = recent.some(e => ['sad', 'tired', 'frustrated', 'stressed', '😰', '😢', '😫', '😴'].includes(e.mood || ''));
    
    return completionRate < 0.6 || hasBadMood;
  }, [habit.id, entries, habit.isAdapted]);

  // Improved Streak calculation (consecutive days)
  const currentStreak = React.useMemo(() => {
    const habitEntries = entries
      .filter(e => e.habitId === habit.id && (e.completed || e.isFreeze))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (habitEntries.length === 0) return 0;
    
    const today = format(startOfToday(), 'yyyy-MM-dd');
    const yesterdayDate = new Date(startOfToday());
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = format(yesterdayDate, 'yyyy-MM-dd');
    
    const hasToday = habitEntries.some(e => e.date === today);
    const hasYesterday = habitEntries.some(e => e.date === yesterday);
    
    if (!hasToday && !hasYesterday) return 0;
    
    let streak = 0;
    let currentDate = hasToday ? new Date(startOfToday()) : yesterdayDate;
    
    const entryDates = new Set(habitEntries.map(e => e.date));
    
    while (entryDates.has(format(currentDate, 'yyyy-MM-dd'))) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }, [habit.id, entries]);

  const target = !habit.targetStreak || Number.isNaN(Number(habit.targetStreak)) ? 7 : Number(habit.targetStreak);
  const progressPercent = target > 0 ? Math.min((currentStreak / target) * 100, 100) : 0;
  const remaining = Math.max(target - currentStreak, 0);

  return (
    <motion.div 
      layout
      className={cn(
        "sprout-card p-6 flex flex-col gap-5 group cursor-pointer transition-all hover:translate-y-[-4px] active:scale-[0.98]",
        isCompleted ? "bg-sprout-olive/5 border-sprout-olive/20 shadow-none" : 
        isFrozen ? "bg-blue-50/30 border-blue-200 shadow-none" : "hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]"
      )}
      onClick={() => onDetails(habit.id)}
    >
      <div className="flex items-start gap-5">
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onToggle(habit.id); }}
          className={cn(
            "w-14 h-14 flex items-center justify-center rounded-2xl transition-all shrink-0 shadow-sm",
            isCompleted ? "bg-sprout-olive text-white" : 
            isFrozen ? "bg-blue-500 text-white" : "bg-sprout-soft/50 text-sprout-olive group-hover:bg-sprout-soft"
          )}
        >
          {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : 
           isFrozen ? <Snowflake className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </motion.div>
        
        <div className="flex-1">
          <h3 className={cn("text-2xl sm:text-3xl font-serif mb-1 transition-all flex items-center gap-2", (isCompleted || isFrozen) ? "text-neutral-400 line-through" : "text-sprout-olive dark:text-white")}>
            <span className="text-xl sm:text-2xl select-none" title={CATEGORY_MAP[habit.category || 'other']?.label}>
              {CATEGORY_MAP[habit.category || 'other']?.emoji || '✨'}
            </span>
            <span>{habit.name}</span>
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium line-clamp-1">
            {habit.description}
          </p>
        </div>

        {!isCompleted && (isFrozen || user.freezesCount > 0) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onFreeze(habit.id); }}
            className={cn(
              "p-2 rounded-xl transition-all",
              isFrozen ? "text-blue-600 bg-blue-100" : "text-blue-400 hover:text-blue-600 hover:bg-blue-50"
            )}
            title={isFrozen ? "Отменить заморозку" : "Заморозить день"}
          >
            <Snowflake className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-3 mt-1">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-sprout-olive/10 dark:bg-sprout-olive/20 p-1.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-sprout-olive" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Стрик: <span className="text-sprout-olive dark:text-white">{currentStreak}</span>
            </span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-600">
            {remaining > 0 ? `Ещё ${remaining} дн.` : 'Цель достигнута!'}
          </div>
        </div>
        
        <div className="relative">
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-sprout-olive to-emerald-400"
            />
          </div>
          {habit.targetStreak > 0 && (
            <div className="absolute -top-1.5 right-0 flex flex-col items-end">
              <div className="w-0.5 h-5 bg-neutral-200 dark:bg-neutral-700" />
              <span className="text-[8px] font-bold text-neutral-400 mt-1">ЦЕЛЬ: {target}</span>
            </div>
          )}
        </div>
      </div>
      
      {isStruggling && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex items-center justify-between gap-3 group/adapt shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">Sprout AI Помощь</span>
              <span className="text-[10px] text-amber-600/80 font-medium leading-none mt-0.5">Кажется, это трудно?</span>
            </div>
          </div>
          <button 
            onClick={() => onAdapt?.(habit)}
            className="px-4 py-2 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-amber-700 hover:shadow-md transition-all active:scale-95"
          >
            Упростить
          </button>
        </motion.div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {Boolean(habit.isAdapted) && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Адаптация
          </div>
        )}
        {isFrozen && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold uppercase tracking-wider">
            <Snowflake className="w-3 h-3" />
            Заморожено
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SmartStatusNotice({ 
  habits, 
  entries, 
  suggestion,
  isAdapting,
  onHide, 
  onAdapt,
  onApply,
  onShowSummary
}: { 
  habits: Habit[], 
  entries: HabitEntry[], 
  suggestion?: any,
  isAdapting?: boolean,
  onHide: () => void, 
  onAdapt: (h: Habit) => void,
  onApply: () => void,
  onShowSummary?: () => void
}) {
  const todayDate = format(startOfToday(), 'yyyy-MM-dd');
  const finishedToday = habits.length > 0 && habits.every(h => entries.some(e => e.habitId === h.id && e.date === todayDate && (e.completed || e.isFreeze)));

  // Find a habit that might need adaptation (missed at least 2 of the last 3 days)
  const strugglingHabit = habits.find(h => {
    if (h.isAdapted) return false;
    // Check last week of entries for this habit
    const hEntries = entries.filter(e => e.habitId === h.id).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7);
    const completionRate = hEntries.filter(e => e.completed || e.isFreeze).length / (hEntries.length || 1);
    return hEntries.length >= 3 && completionRate < 0.5;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-lg z-50"
    >
      <div className="relative overflow-hidden rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10">
        {/* Background Mesh */}
        <div className={cn(
          "absolute inset-0 transition-colors duration-700",
          finishedToday ? "bg-sprout-olive" : 
          suggestion ? "bg-purple-600" :
          strugglingHabit ? "bg-amber-600" : "bg-neutral-900 dark:bg-sprout-dark-card"
        )} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 blur-2xl -ml-12 -mb-12 rounded-full" />

        <div className="relative p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-6">
            <motion.div 
              animate={isAdapting ? { rotate: 360 } : { scale: [1, 1.1, 1] }}
              transition={isAdapting ? { repeat: Infinity, duration: 2, ease: "linear" } : { repeat: Infinity, duration: 4 }}
              className="w-14 h-14 bg-white/10 backdrop-blur-md flex items-center justify-center rounded-2xl shrink-0 border border-white/10"
            >
              {finishedToday ? 
                <Sparkles className="w-7 h-7 text-white" /> : 
                suggestion ?
                <Sparkles className="w-8 h-8 text-white" /> :
                strugglingHabit ? 
                <BrainCircuit className="w-7 h-7 text-white" /> :
                <Sparkles className="w-7 h-7 text-white animate-pulse" />
              }
            </motion.div>

            <div className="flex-1">
              <h4 className="font-serif text-white text-xl sm:text-2xl leading-none mb-2">
                {finishedToday ? "День прожит не зря!" : 
                 suggestion ? "Адаптация Sprout AI" :
                 strugglingHabit ? "Заметили трудности?" : "Напоминание Sprout"}
              </h4>
              <div className="text-white/70 text-sm leading-snug font-medium line-clamp-3">
                {finishedToday 
                  ? "Вы выполнили все задачи на сегодня. Ваш сад процветает! Время для отдыха."
                  : suggestion
                  ? `Предложение: «${suggestion.name}». ${suggestion.reason}`
                  : strugglingHabit 
                  ? `Кажется, привычка «${strugglingHabit.name}» идет не по плану. Хотите совет от ИИ, как её облегчить?`
                  : "Остались небольшие дела. Сделайте шаг к цели или используйте заморозку."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {strugglingHabit && !suggestion && (
              <button 
                onClick={() => onAdapt(strugglingHabit)}
                disabled={isAdapting}
                className="flex-1 bg-white text-amber-600 font-bold py-3.5 rounded-2xl text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                {isAdapting ? 'Генерирую...' : 'Адаптировать с ИИ'}
              </button>
            )}

              {suggestion && (
                <button 
                  onClick={() => onApply()}
                  className="flex-1 bg-white text-purple-600 font-bold py-3.5 rounded-2xl text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Применить адаптацию
                </button>
              )}

              {finishedToday && onShowSummary && (
                <button 
                  onClick={onShowSummary}
                  className="flex-1 bg-white text-sprout-olive font-bold py-3.5 rounded-2xl text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Посмотреть итоги
                </button>
              )}

            <button 
              onClick={onHide}
              className="px-6 py-3.5 bg-black/20 text-white font-bold rounded-2xl text-sm hover:bg-black/30 transition-all active:scale-95"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import { DAILY_QUOTES } from './constants';

function QuoteOfTheDay() {
  const dayOfMonth = new Date().getDate(); // 1-31
  const quote = DAILY_QUOTES[(dayOfMonth - 1) % DAILY_QUOTES.length];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative overflow-hidden mb-12 rounded-[48px] border border-sprout-olive/5 dark:border-white/5"
    >
      {/* Background with mesh gradient feel */}
      <div className="absolute inset-0 bg-sprout-soft dark:bg-sprout-dark-card transition-colors duration-500" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sprout-olive/10 dark:bg-sprout-olive/20 blur-[100px] -mr-48 -mt-48 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/40 dark:bg-white/5 blur-[80px] -ml-24 -mb-24 rounded-full" />
      
      <div className="relative p-8 sm:p-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 text-sprout-olive dark:text-neutral-400 font-bold mb-8 uppercase tracking-[0.4em] text-[9px]">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Мудрость дня
            </div>
            
            <div className="relative">
              <Quote className="absolute -top-6 -left-8 w-16 h-16 text-sprout-olive/10 dark:text-white/5 -rotate-6" />
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl sm:text-4xl md:text-5xl font-serif text-neutral-900 dark:text-white leading-[1.15] italic relative z-10"
              >
                {quote.text}
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="h-[1px] w-12 bg-sprout-olive/30 dark:bg-white/20" />
              <div className="flex flex-col">
                <span className="text-lg font-serif dark:text-neutral-300">{quote.author}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mt-0.5">Вдохновение для роста</span>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="hidden lg:flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[32px] border border-white/20 dark:border-white/10 shadow-xl"
          >
            <div className="text-4xl font-serif text-sprout-olive dark:text-white mb-1">
              {format(new Date(), 'dd')}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {format(new Date(), 'MMM')}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function CalendarView({ 
  habits, 
  entries, 
}: { 
  habits: Habit[], 
  entries: HabitEntry[],
  onToggle: (habitId: number) => void,
  onFreeze: (habitId: number) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sprout-card p-4 sm:p-10 mb-8 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-4">
          <h3 className="text-3xl font-serif dark:text-white capitalize">
            {format(currentMonth, 'LLLL yyyy')}
          </h3>
          <button 
            onClick={goToToday}
            className="px-4 py-1.5 bg-sprout-soft/30 dark:bg-sprout-dark-border text-sprout-olive dark:text-neutral-400 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-sprout-soft transition-colors"
          >
            Сегодня
          </button>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={prevMonth}
            className="p-3 bg-white dark:bg-sprout-dark-bg text-neutral-400 hover:text-sprout-olive rounded-2xl border border-neutral-100 dark:border-sprout-dark-border transition-all shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-3 bg-white dark:bg-sprout-dark-bg text-neutral-400 hover:text-sprout-olive rounded-2xl border border-neutral-100 dark:border-sprout-dark-border transition-all shadow-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-100 dark:bg-neutral-800 rounded-[32px] overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-inner">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
          <div key={day} className="bg-neutral-50 dark:bg-sprout-dark-bg p-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            {day}
          </div>
        ))}
        {days.map(day => {
          const isSelectedMonth = isSameMonth(day, currentMonth);
          const isTodayDay = isToday(day);
          const dayEntries = entries.filter(e => isSameDay(parseISO(e.date), day));
          const completedCount = dayEntries.filter(e => e.completed || e.isFreeze).length;
          const totalHabits = habits.length;
          const isFutureDate = isFuture(day);

          return (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[110px] sm:min-h-[140px] bg-white dark:bg-sprout-dark-card p-3 sm:p-4 transition-all relative group",
                !isSelectedMonth && "opacity-25 grayscale",
                isTodayDay && "after:absolute after:inset-0 after:border-2 after:border-sprout-olive/20 after:pointer-events-none"
              )}
            >
              <div className={cn(
                "text-base font-medium mb-3 w-8 h-8 flex items-center justify-center rounded-xl transition-colors",
                isTodayDay ? "bg-sprout-olive text-white shadow-md shadow-sprout-olive/20" : "text-neutral-500 dark:text-neutral-400"
              )}>
                {format(day, 'd')}
              </div>
              
              <div className="grid grid-cols-4 gap-1.5">
                {habits.slice(0, 8).map(habit => {
                  const entry = dayEntries.find(e => e.habitId === habit.id);
                  const isDone = entry?.completed;
                  const isFrozen = entry?.isFreeze;

                  return (
                    <div 
                      key={habit.id}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-transparent transition-all",
                        isDone ? "bg-sprout-olive ring-sprout-olive/20 scale-110" : 
                        isFrozen ? "bg-blue-500 ring-blue-100" : "bg-neutral-100 dark:bg-neutral-800"
                      )}
                      title={habit.name}
                    />
                  );
                })}
              </div>

              {isSelectedMonth && !isFutureDate && totalHabits > 0 && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black tracking-tighter">
                    {Math.round((completedCount / totalHabits) * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'calendar' | 'stats' | 'journal'>('dashboard');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [journalSearch, setJournalSearch] = useState('');
  const [journalMoodFilter, setJournalMoodFilter] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryShownDate, setSummaryShownDate] = useState<string | null>(localStorage.getItem('sprout_summary_date'));
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdaptationNotice, setShowAdaptationNotice] = useState(false);
  const [adaptationTarget, setAdaptationTarget] = useState<Habit | null>(null);
  const [suggestedAdaptation, setSuggestedAdaptation] = useState<any>(null);
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'error' | 'info'}[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleAdaptHabit = async (habit: Habit) => {
    setLoading(true);
    try {
      // Calculate completion rate for this habit
      const hEntries = entries.filter(e => e.habitId === habit.id);
      const completionRate = hEntries.filter(e => e.completed || e.isFreeze).length / Math.max(hEntries.length, 1);
      
      // Get most recent mood if available
      const latestMood = hEntries.sort((a,b) => b.date.localeCompare(a.date))[0]?.mood;

      const suggestion = await api.aiAdapt({
        name: habit.name,
        description: habit.description,
        completionRate,
        mood: latestMood
      });
      
      setSuggestedAdaptation({ ...suggestion, originalHabit: habit });
      setAdaptationTarget(habit);
    } catch (err) {
      console.error(err);
      addToast('Не удалось получить совет от ИИ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyAdaptation = async () => {
    if (!suggestedAdaptation || !adaptationTarget) return;
    setLoading(true);
    try {
      await api.updateHabit(adaptationTarget.id, {
        name: suggestedAdaptation.name,
        description: suggestedAdaptation.description,
        isAdapted: true
      });
      addToast('Привычка успешно адаптирована!');
      setSuggestedAdaptation(null);
      setAdaptationTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      addToast('Ошибка при адаптации', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = api.getToken();
        if (token) {
          const u = await api.getMe();
          setUser(u);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Init failed:', err);
        api.setToken(null);
        setUser(null);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.theme === 'dark') {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
      loadData();
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (habits.length > 0) {
      const todayDate = format(startOfToday(), 'yyyy-MM-dd');
      const finishedToday = habits.every(h => entries.some(e => e.habitId === h.id && e.date === todayDate && (e.completed || e.isFreeze)));
      
      if (finishedToday && summaryShownDate !== todayDate) {
        setShowSummaryModal(true);
        setSummaryShownDate(todayDate);
        localStorage.setItem('sprout_summary_date', todayDate);
      }

      if (finishedToday) {
        setShowAdaptationNotice(true);
      } else {
        const hour = new Date().getHours();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        const missedYesterday = habits.some(habit => !entries.find(entry => entry.habitId === habit.id && entry.date === yesterdayStr && (entry.completed || entry.isFreeze)));
        
        if (hour >= 20 || missedYesterday) {
          setShowAdaptationNotice(true);
        }
      }
    }
  }, [habits, entries]);

  const toggleTheme = async () => {
    if (!user) return;
    const newTheme = user.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    
    setUser({ ...user, theme: newTheme });
    await api.updateSettings({ theme: newTheme });
  };

  const loadData = async () => {
    try {
      const [h, e, s] = await Promise.all([
        api.getHabits(), 
        api.getEntries(),
        api.getStats()
      ]);
      setHabits(h);
      setEntries(e);
      setStats(s);
    } catch (err) {
      console.error('Failed to load data:', err);
      // Don't toast here as it's a background fetch usually
    }
  };

  const toggleHabit = async (habitId: number) => {
    const date = format(startOfToday(), 'yyyy-MM-dd');
    const existing = entries.find(e => e.habitId === habitId && e.date === date);
    
    try {
      if (existing) {
        await api.deleteEntry({ habitId, date });
        addToast('Привычка отменена', 'info');
        const u = await api.getMe(); // Refetch user in case it was a freeze refund
        setUser(u);
        loadData();
      } else {
        await api.createEntry({ habitId, date, completed: true });
        addToast('Отлично сработано!');
        loadData();
      }
    } catch (err) {
      console.error(err);
      addToast('Ошибка действия', 'error');
    }
  };

  const freezeHabit = async (habitId: number) => {
    const date = format(startOfToday(), 'yyyy-MM-dd');
    const existing = entries.find(e => e.habitId === habitId && e.date === date);

    try {
      if (existing && existing.isFreeze) {
        await api.deleteEntry({ habitId, date });
        addToast('Заморозка отменена', 'info');
        const u = await api.getMe();
        setUser(u);
        loadData();
      } else if (!existing) {
        if (user && user.freezesCount > 0) {
          await api.createEntry({ habitId, date, isFreeze: true });
          addToast('День заморожен ❄️');
          const u = await api.getMe();
          setUser(u);
          loadData();
        } else {
          addToast('Нет доступных заморозок', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Ошибка заморозки', 'error');
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
  };

  if (loading) return null;

  if (!user) return <AuthForm onAuth={setUser} />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16 min-h-screen pb-32 transition-all">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1"
        >
          <div className="flex items-center gap-2.5 text-sprout-olive dark:text-neutral-400 font-bold mb-2 tracking-wide">
            <Leaf className="w-6 h-6" />
            <span className="uppercase text-[10px] tracking-[0.3em] font-black">Sprout Habit Tracker</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-serif leading-tight">
            Привет, {user.displayName}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg sm:text-2xl mt-4 font-serif italic">
            {view === 'dashboard' ? `Сегодня ${format(new Date(), 'EEEE, d MMMM')}` : 
             view === 'calendar' ? 'Ваш календарь привычек' :
             view === 'stats' ? 'Ваш прогресс в деталях' : 'Ваш личный журнал заметок'}
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50/50 text-blue-600 rounded-3xl border border-blue-100/50 backdrop-blur-sm">
            <Snowflake className="w-5 h-5" />
            <span className="font-bold text-lg">{user.freezesCount}</span>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-4 bg-white dark:bg-sprout-dark-card text-neutral-400 hover:text-sprout-olive rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-neutral-100 dark:border-sprout-dark-border transition-all hover:scale-105 active:scale-95"
          >
            {user.theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          </button>
          <button 
            onClick={handleLogout}
            className="p-4 bg-white dark:bg-sprout-dark-card text-neutral-400 hover:text-red-500 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-neutral-100 dark:border-sprout-dark-border transition-all hover:scale-105 active:scale-95"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </motion.div>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <QuoteOfTheDay />
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border shrink-0",
                    selectedCategoryFilter === 'all'
                      ? "bg-sprout-olive text-white border-transparent shadow-md shadow-sprout-olive/20"
                      : "bg-white dark:bg-sprout-dark-card text-neutral-400 border-neutral-100 dark:border-sprout-dark-border hover:border-sprout-soft"
                  )}
                >
                  Все ({habits.length})
                </button>
                {Object.entries(CATEGORY_MAP).map(([key, cat]) => {
                  const count = habits.filter(h => h.category === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategoryFilter(key)}
                      className={cn(
                        "px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 shrink-0",
                        selectedCategoryFilter === key
                          ? "bg-sprout-olive text-white border-transparent shadow-md shadow-sprout-olive/20"
                          : "bg-white dark:bg-sprout-dark-card text-neutral-400 border-neutral-100 dark:border-sprout-dark-border hover:border-sprout-soft"
                      )}
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span>{cat.label} ({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  const filteredHabits = habits.filter(h => selectedCategoryFilter === 'all' || h.category === selectedCategoryFilter);
                  
                  return (
                    <>
                      {filteredHabits.map((habit) => (
                        <div key={habit.id}>
                          <HabitCard 
                            habit={habit} 
                            entries={entries} 
                            user={user}
                            onToggle={toggleHabit} 
                            onFreeze={freezeHabit}
                            onDetails={(id) => setSelectedHabitId(id)}
                            onAdapt={(h) => {
                              handleAdaptHabit(h);
                              setShowAdaptationNotice(true);
                            }}
                          />
                        </div>
                      ))}
                      {filteredHabits.length === 0 && habits.length > 0 && (
                        <div className="col-span-1 md:col-span-2 text-center py-12 px-6 bg-white dark:bg-sprout-dark-card rounded-3xl border border-neutral-100 dark:border-neutral-800">
                          <p className="text-neutral-400 text-sm">В этой категории пока нет привычек.</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowNewModal(true)}
                  className="sprout-card p-8 border-2 border-dashed border-sprout-soft bg-transparent flex flex-col items-center justify-center gap-4 text-sprout-olive/60 hover:text-sprout-olive hover:bg-white hover:border-sprout-olive transition-all min-h-[160px]"
                >
                  <div className="w-12 h-12 rounded-full bg-sprout-soft/30 flex items-center justify-center">
                    <Plus className="w-8 h-8" />
                  </div>
                  <span className="font-medium text-lg">Добавить привычку</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {view === 'calendar' && (
            <CalendarView 
              habits={habits} 
              entries={entries} 
              onToggle={toggleHabit}
              onFreeze={freezeHabit}
            />
          )}

          {view === 'stats' && stats && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-8 bg-sprout-olive dark:bg-neutral-800 rounded-[32px] text-white shadow-lg">
                  <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">Всего выполнено</div>
                  <div className="text-6xl font-serif">{stats.totalCompleted}</div>
                </div>
                <div className="sprout-card p-8">
                  <div className="text-neutral-500 dark:text-neutral-400 text-sm font-medium uppercase tracking-wider mb-2">Активных привычек</div>
                  <div className="text-6xl font-serif text-sprout-olive dark:text-white">{stats.activeHabits}</div>
                </div>
              </div>

              <div className="sprout-card p-8">
                <h3 className="text-2xl mb-6">Активность за последние 7 дней</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.dailyStats}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={user?.theme === 'dark' ? '#FFF' : '#1B4332'} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={user?.theme === 'dark' ? '#FFF' : '#1B4332'} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={user?.theme === 'dark' ? '#1E2E2A' : '#E5E7EB'} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: user?.theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12, fontWeight: 500 }} 
                            tickFormatter={(val) => format(parseISO(val), 'dd.MM')}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: user?.theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12, fontWeight: 500 }} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              backgroundColor: user?.theme === 'dark' ? '#121D1B' : '#FFFDFB',
                              color: user?.theme === 'dark' ? '#E2E8DE' : '#1B4332'
                            }}
                            labelFormatter={(val) => format(parseISO(val), 'd MMMM')}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke={user?.theme === 'dark' ? '#FFF' : '#1B4332'} 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCount)" 
                          />
                        </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mood Correlation Analysis */}
              <div className="sprout-card p-8">
                <h3 className="text-2xl mb-2 flex items-center gap-2">
                  <span>🧠</span>
                  <span>Влияние настроения на привычки</span>
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
                  Анализ вашей продуктивности в зависимости от эмоционального состояния.
                </p>

                {(() => {
                  const totalMoodEntries = entries.filter(e => e.mood);
                  const moodsList = [
                    { emoji: '😊', value: 'great', label: 'Прекрасно', color: 'bg-emerald-500' },
                    { emoji: '💪', value: 'strong', label: 'Бодро', color: 'bg-blue-500' },
                    { emoji: '😐', value: 'neutral', label: 'Обычное', color: 'bg-neutral-500' },
                    { emoji: '😫', value: 'tired', label: 'Устал(а)', color: 'bg-amber-500' },
                    { emoji: '😔', value: 'sad', label: 'Грустно', color: 'bg-red-500' },
                  ];

                  const moodStats = moodsList.map(item => {
                    const matched = entries.filter(e => e.mood === item.value);
                    const completed = matched.filter(e => e.completed).length;
                    const completionRate = matched.length > 0 ? Math.round((completed / matched.length) * 100) : 0;
                    return {
                      ...item,
                      count: matched.length,
                      completionRate,
                    };
                  }).filter(st => st.count > 0);

                  if (moodStats.length === 0) {
                    return (
                      <div className="p-6 bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-neutral-100 dark:border-neutral-800/50 text-center">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                          💡 <strong>Мало данных для анализа.</strong> Начните чаще записывать своё настроение при выполнении привычек! Для этого кликайте по кнопке привычки в Дневнике или при обновлении записей.
                        </p>
                      </div>
                    );
                  }

                  // Find highest and lowest productive moods
                  const sortedProductive = [...moodStats].sort((a,b) => b.completionRate - a.completionRate);
                  const bestMood = sortedProductive[0];
                  const worstMood = sortedProductive[sortedProductive.length - 1];

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 flex gap-4 items-center">
                          <span className="text-3xl p-2 bg-white dark:bg-neutral-800 rounded-xl shadow-xs leading-none select-none">🎉</span>
                          <div>
                            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Пик продуктивности</div>
                            <div className="text-sm font-medium mt-1">
                              Когда у вас <strong>{bestMood.label} {bestMood.emoji}</strong>, вы выполняете <strong>{bestMood.completionRate}%</strong> привычек!
                            </div>
                          </div>
                        </div>

                        {sortedProductive.length > 1 && (
                          <div className="p-5 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20 flex gap-4 items-center">
                            <span className="text-3xl p-2 bg-white dark:bg-neutral-800 rounded-xl shadow-xs leading-none select-none">⚠️</span>
                            <div>
                              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Зона спада</div>
                              <div className="text-sm font-medium mt-1">
                                В состоянии <strong>{worstMood.label} {worstMood.emoji}</strong> ваша продуктивность падает до <strong>{worstMood.completionRate}%</strong>.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Выполняемость привычек по настроениям:</div>
                        {moodStats.map(m => (
                          <div key={m.value} className="space-y-2">
                            <div className="flex justify-between items-center text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <span className="text-lg select-none">{m.emoji}</span>
                                <span>{m.label} <span className="text-xs text-neutral-400">({m.count} раз)</span></span>
                              </span>
                              <span>{m.completionRate}% выполнено</span>
                            </div>
                            <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-500", m.color)}
                                style={{ width: `${m.completionRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {view === 'journal' && (
            <motion.div 
              key="journal"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              className="space-y-6"
            >
              {/* Journal Filters */}
              <div className="bg-white dark:bg-sprout-dark-card p-6 rounded-[32px] border border-neutral-100 dark:border-sprout-dark-border space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                  <div className="flex-1">
                    <input 
                      type="text"
                      placeholder="Поиск по вашим заметкам..."
                      value={journalSearch}
                      onChange={(e) => setJournalSearch(e.target.value)}
                      className="w-full sprout-input text-sm py-3"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setJournalMoodFilter(null)}
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                        journalMoodFilter === null 
                          ? "bg-sprout-olive text-white" 
                          : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400"
                      )}
                    >
                      Все
                    </button>
                    {[
                      { emoji: '😊', value: 'great', label: 'Прекрасно' },
                      { emoji: '😐', value: 'neutral', label: 'Обычное' },
                      { emoji: '😫', value: 'tired', label: 'Устал(а)' },
                      { emoji: '😔', value: 'sad', label: 'Грустно' },
                      { emoji: '💪', value: 'strong', label: 'Бодро' },
                    ].map(item => (
                      <button
                        key={item.value}
                        title={item.label}
                        onClick={() => setJournalMoodFilter(item.value)}
                        className={cn(
                          "w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all border",
                          journalMoodFilter === item.value 
                            ? "bg-sprout-olive text-white border-transparent shadow-md" 
                            : "bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-100 dark:border-neutral-700 hover:border-neutral-300"
                        )}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Journal List */}
              <div className="space-y-4">
                {(() => {
                  const filteredEntries = entries
                    .filter(e => {
                      const habitExists = habits.some(h => h.id === e.habitId);
                      const hasNotesOrMood = !!(e.notes || e.mood);
                      return habitExists && hasNotesOrMood;
                    })
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .filter(e => {
                      const matchSearch = journalSearch 
                        ? e.notes?.toLowerCase().includes(journalSearch.toLowerCase()) 
                        : true;
                      const matchMood = journalMoodFilter 
                        ? e.mood === journalMoodFilter 
                        : true;
                      return matchSearch && matchMood;
                    });

                  if (filteredEntries.length === 0) {
                    return (
                      <div className="text-center py-16 px-6 bg-white dark:bg-sprout-dark-card rounded-[32px] border border-neutral-100 dark:border-sprout-dark-border">
                        <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 text-neural-400">
                          🗒️
                        </div>
                        <h4 className="text-xl font-serif text-neutral-800 dark:text-neutral-200 mb-2">Записи не найдены</h4>
                        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
                          Записывайте ваши мысли и настроение при выполнении привычек, чтобы вести здесь свой ежедневный дневник.
                        </p>
                      </div>
                    );
                  }

                  return filteredEntries.map(entry => {
                    const habit = habits.find(h => h.id === entry.habitId)!;
                    const catInfo = CATEGORY_MAP[habit.category || 'other'];
                    
                    return (
                      <div key={entry.id} className="sprout-card p-6 flex flex-col gap-4 bg-white dark:bg-sprout-dark-card border border-neutral-100 dark:border-sprout-dark-border transition-all hover:border-sprout-soft">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                              {format(parseISO(entry.date), 'dd MMMM yyyy, EEEE')}
                            </span>
                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5", catInfo?.bg || 'bg-neutral-50', catInfo?.color || 'text-neutral-600')}>
                              <span>{catInfo?.emoji}</span>
                              <span>{habit.name}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                // Direct entry notes edit
                                const text = prompt('Редактировать заметку:', entry.notes || '');
                                if (text === null) return;
                                api.updateEntry(entry.id, { notes: text }).then(() => {
                                  addToast('Записька обновлена!');
                                  loadData();
                                }).catch(() => {
                                  addToast('Ошибка', 'error');
                                });
                              }}
                              className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 hover:text-sprout-olive"
                            >
                              Изменить
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Очистить заметку и настроение для этой записи?')) {
                                  api.updateEntry(entry.id, { notes: '', mood: '' }).then(() => {
                                    addToast('Записька удалена', 'error');
                                    loadData();
                                  }).catch(() => {
                                    addToast('Ошибка', 'error');
                                  });
                                }
                              }}
                              className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 hover:text-red-500"
                            >
                              Очистить
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-4 items-start bg-neutral-50/50 dark:bg-neutral-800/10 p-4 rounded-2xl border border-neutral-100/50 dark:border-neutral-800/30">
                          {entry.mood && (
                            <div className="text-3xl p-1.5 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100/10">
                              {(() => {
                                const moods = [
                                  { emoji: '😊', value: 'great' },
                                  { emoji: '😐', value: 'neutral' },
                                  { emoji: '😫', value: 'tired' },
                                  { emoji: '😔', value: 'sad' },
                                  { emoji: '💪', value: 'strong' },
                                ];
                                return moods.find(m => m.value === entry.mood)?.emoji || '😊';
                              })()}
                            </div>
                          )}
                          <div className="flex-1">
                            {entry.notes ? (
                              <p className="text-neutral-700 dark:text-neutral-300 text-base leading-relaxed italic">
                                "{entry.notes}"
                              </p>
                            ) : (
                              <p className="text-neutral-400 text-sm italic">
                                Без текстовой заметки (сохранено только настроение)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* New Habit Modal */}
      <AnimatePresence>
        {showNewModal && (
          <CreateHabitModal 
            onClose={() => setShowNewModal(false)} 
            addToast={addToast}
            onCreated={loadData} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummaryModal && (
          <DailySummaryModal 
            habits={habits}
            entries={entries}
            onClose={() => setShowSummaryModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedHabitId && habits.find(h => h.id === selectedHabitId) && (
          <HabitDetailsModal 
            habit={habits.find(h => h.id === selectedHabitId)!}
            entries={entries}
            onClose={() => setSelectedHabitId(null)}
            addToast={addToast}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdaptationNotice && (
          <SmartStatusNotice 
            habits={habits} 
            entries={entries} 
            suggestion={suggestedAdaptation}
            isAdapting={loading}
            onHide={() => setShowAdaptationNotice(false)} 
            onAdapt={handleAdaptHabit}
            onApply={applyAdaptation}
            onShowSummary={() => setShowSummaryModal(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <div className="fixed top-8 right-8 z-[200] flex flex-col gap-3 pointer-events-none">
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "px-6 py-4 rounded-3xl shadow-2xl pointer-events-auto border flex items-center gap-3 backdrop-blur-md",
                toast.type === 'success' ? "bg-sprout-olive dark:bg-white text-white dark:text-neutral-900 border-white/20 dark:border-neutral-200" : 
                toast.type === 'error' ? "bg-red-500 text-white border-red-400" : 
                "bg-neutral-900 text-white border-neutral-700"
              )}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <Trash2 className="w-5 h-5" />}
              <span className="font-bold text-sm">{toast.message}</span>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 p-2 bg-white/80 backdrop-blur-md border border-white/20 rounded-full shadow-lg z-40 dark:bg-sprout-dark-card/80">
        <button 
          onClick={() => setView('dashboard')}
          className={cn(
            "p-4 rounded-full transition-all",
            view === 'dashboard' ? "bg-sprout-olive text-white shadow-lg" : "text-neutral-400 hover:text-sprout-olive"
          )}
        >
          <Leaf className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('calendar')}
          className={cn(
            "p-4 rounded-full transition-all",
            view === 'calendar' ? "bg-sprout-olive text-white shadow-lg" : "text-neutral-400 hover:text-sprout-olive"
          )}
        >
          <Calendar className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('stats')}
          className={cn(
            "p-4 rounded-full transition-all",
            view === 'stats' ? "bg-sprout-olive text-white shadow-lg" : "text-neutral-400 hover:text-sprout-olive"
          )}
        >
          <BarChart3 className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('journal')}
          className={cn(
            "p-4 rounded-full transition-all",
            view === 'journal' ? "bg-sprout-olive text-white shadow-lg" : "text-neutral-400 hover:text-sprout-olive"
          )}
          title="Дневник заметок"
        >
          <History className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function HabitDetailsModal({ 
  habit, 
  entries, 
  onClose, 
  addToast,
  onUpdate 
}: { 
  habit: Habit, 
  entries: HabitEntry[], 
  onClose: () => void, 
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  onUpdate: () => void 
}) {
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editMood, setEditMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reminderTime, setReminderTime] = useState(habit.reminderTime || '');
  const [reminderDays, setReminderDays] = useState<number[]>(habit.reminderDays ? JSON.parse(habit.reminderDays) : [0,1,2,3,4,5,6]);

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editDesc, setEditDesc] = useState(habit.description || '');
  const [editTarget, setEditTarget] = useState(habit.targetStreak || 7);
  const [editCategory, setEditCategory] = useState(habit.category || 'other');

  const handleUpdateHabitDetails = async () => {
    if (!editName.trim()) {
      addToast('Название привычки не может быть пустым', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.updateHabit(habit.id, {
        name: editName,
        description: editDesc,
        targetStreak: editTarget,
        category: editCategory,
      });
      addToast('Привычка обновлена!');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      addToast('Ошибка обновления привычки', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setReminderDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleUpdateReminder = async () => {
    setLoading(true);
    try {
      await api.updateHabit(habit.id, {
        reminderTime: reminderTime,
        reminderDays: JSON.stringify(reminderDays)
      });
      addToast('Напоминания обновлены');
      setShowSettings(false);
      onUpdate();
    } catch (err) {
      addToast('Ошибка обновления', 'error');
    } finally {
      setLoading(false);
    }
  };

  const moods = [
    { emoji: '😊', value: 'great' },
    { emoji: '😐', value: 'neutral' },
    { emoji: '😫', value: 'tired' },
    { emoji: '😔', value: 'sad' },
    { emoji: '💪', value: 'strong' },
  ];

  const habitEntries = entries
    .filter(e => e.habitId === habit.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
    setLoading(true);
    try {
      await api.deleteEntryById(entryId);
      addToast('Запись удалена', 'error');
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async (entryId: number) => {
    setLoading(true);
    try {
      await api.updateEntry(entryId, { notes: editNotes, mood: editMood });
      addToast('Запись обновлена');
      setEditingEntryId(null);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHabit = async () => {
    if (!confirm(`Вы уверены, что хотите удалить привычку "${habit.name}"? Все записи будут также удалены.`)) return;
    setLoading(true);
    try {
      await api.deleteHabit(habit.id);
      addToast('Привычка удалена', 'error');
      onClose();
      onUpdate();
    } catch (err) {
      console.error(err);
      addToast('Ошибка при удалении', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-sprout-olive/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-sprout-dark-card rounded-[40px] p-6 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-600 z-10 transition-colors">
          <Plus className="w-8 h-8 rotate-45" />
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sprout-olive dark:text-neutral-400 font-bold mb-2 uppercase tracking-widest text-[10px]">
              <History className="w-4 h-4" />
              Детали привычки
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (!isEditing) {
                    setShowSettings(false);
                  }
                }}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isEditing ? "bg-sprout-olive text-white shadow-lg shadow-sprout-olive/20" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
                )}
                title="Редактировать параметры"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDeleteHabit}
                className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                title="Удалить привычку"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  if (!showSettings) {
                    setIsEditing(false);
                  }
                }}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  showSettings ? "bg-sprout-olive text-white shadow-lg shadow-sprout-olive/20" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                )}
                title="Настройки напоминаний"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-4 bg-neutral-50 dark:bg-neutral-800/20 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-800 mt-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Параметры привычки</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 ml-1">Название</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="sprout-input w-full py-2.5 text-base"
                    placeholder="Что вы хотите делать?"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 ml-1">Описание (необязательно)</label>
                  <input 
                    type="text" 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="sprout-input w-full py-2.5 text-base"
                    placeholder="Какая цель или почему важно?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 ml-1">Серия (дней)</label>
                    <input 
                      type="number" 
                      value={Number.isNaN(editTarget) ? '' : editTarget}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setEditTarget(Number.isNaN(val) ? 0 : val);
                      }}
                      className="sprout-input w-full py-2.5 text-base"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 ml-1">Категория</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="sprout-input w-full py-2.5 text-base cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 font-bold"
                    >
                      {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                        <option key={key} value={key}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={handleUpdateHabitDetails}
                    disabled={loading}
                    className="flex-1 bg-sprout-olive text-white py-3 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-wider"
                  >
                    {loading ? 'Секунду...' : 'Сохранить изменения'}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(habit.name);
                      setEditDesc(habit.description || '');
                      setEditTarget(habit.targetStreak || 7);
                      setEditCategory(habit.category || 'other');
                    }}
                    className="px-5 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-2xl font-bold transition-all text-xs uppercase tracking-wider hover:bg-neutral-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h3 className="text-4xl font-serif mb-2 flex items-center gap-2.5">
                <span className="text-3xl leading-none select-none" title={CATEGORY_MAP[habit.category || 'other']?.label}>
                  {CATEGORY_MAP[habit.category || 'other']?.emoji}
                </span>
                <span>{habit.name}</span>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 italic text-sm">{habit.description || 'Нет описания'}</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-neutral-100 dark:border-neutral-800 mb-6"
            >
              <div className="bg-neutral-50 dark:bg-neutral-800/30 p-6 rounded-3xl space-y-4 mb-6">
                <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Настройки напоминаний</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Время уведомления</label>
                    <input 
                      type="time" 
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="sprout-input w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Дни недели</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx)}
                        className={cn(
                          "w-10 h-10 rounded-xl font-bold transition-all",
                          reminderDays.includes(idx) ? "bg-sprout-olive text-white shadow-md shadow-sprout-olive/20" : "bg-white dark:bg-neutral-800 text-neutral-400 border border-neutral-100 dark:border-neutral-700"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={handleUpdateReminder}
                  disabled={loading}
                  className="w-full bg-sprout-olive text-white py-3 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Секунду...' : 'Сохранить напоминания'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <section>
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
              История активности
              <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-600">
                {habitEntries.length}
              </span>
            </h4>
            
            <div className="space-y-3">
              {habitEntries.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 border-2 border-dashed border-neutral-100 rounded-3xl">
                  Пока нет записей
                </div>
              ) : (
                habitEntries.map((entry) => (
                  <div key={entry.id} className="sprout-card p-4 sm:p-6 transition-all hover:bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          entry.completed ? "bg-sprout-olive text-white" : 
                          entry.isFreeze ? "bg-blue-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                        )}>
                          {entry.completed ? <CheckCircle2 className="w-5 h-5" /> : 
                           entry.isFreeze ? <Snowflake className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white group">
                            {format(parseISO(entry.date), 'd MMMM yyyy, EEEE')}
                          </div>
                          {editingEntryId === entry.id ? (
                            <div className="mt-3 space-y-4">
                              <div className="flex gap-2">
                                {moods.map(m => (
                                  <button
                                    key={m.value}
                                    onClick={() => setEditMood(m.value)}
                                    className={cn(
                                      "w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all",
                                      editMood === m.value ? "bg-sprout-olive text-white scale-110 shadow-md" : "bg-neutral-100 dark:bg-neutral-800"
                                    )}
                                  >
                                    {m.emoji}
                                  </button>
                                ))}
                              </div>
                              <textarea 
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full sprout-input p-3 text-sm min-h-[80px]"
                                placeholder="Добавьте заметку..."
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpdateEntry(entry.id)}
                                  className="px-4 py-2 bg-sprout-olive text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                  Сохранить
                                </button>
                                <button 
                                  onClick={() => setEditingEntryId(null)}
                                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl text-sm font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {entry.notes && (
                                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg italic border-l-2 border-sprout-olive/20">
                                  {entry.mood && <span className="mr-2 not-italic">{moods.find(m => m.value === entry.mood)?.emoji}</span>}
                                  {entry.notes}
                                </p>
                              )}
                              {!entry.notes && entry.mood && (
                                <div className="mt-1 text-xl">
                                  {moods.find(m => m.value === entry.mood)?.emoji}
                                </div>
                              )}
                              <div className="flex items-center gap-4 mt-3">
                                <button 
                                  onClick={() => {
                                    setEditingEntryId(entry.id);
                                    setEditNotes(entry.notes || '');
                                    setEditMood(entry.mood || '');
                                  }}
                                  className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 hover:text-sprout-olive flex items-center gap-1.5 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Редактировать
                                </button>
                                <button 
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 hover:text-red-500 flex items-center gap-1.5 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Удалить
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {!!entry.isFreeze && (
                        <span className="text-[9px] font-black uppercase tracking-tighter text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 mt-1.5">
                          Freeze
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DailySummaryModal({ 
  habits, 
  entries, 
  onClose 
}: { 
  habits: Habit[], 
  entries: HabitEntry[], 
  onClose: () => void 
}) {
  const todayDate = format(startOfToday(), 'yyyy-MM-dd');
  const finishedHabits = habits.filter(h => entries.some(e => e.habitId === h.id && e.date === todayDate && (e.completed || e.isFreeze)));
  const progressPercent = habits.length > 0 ? (finishedHabits.length / habits.length) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-sprout-dark-card rounded-[48px] p-8 sm:p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sprout-olive/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/5 blur-[60px] -ml-24 -mb-24 rounded-full" />

        <div className="relative text-center">
          <motion.div 
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-sprout-olive text-white rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl shadow-sprout-olive/20"
          >
            <Sparkles className="w-12 h-12" />
          </motion.div>

          <h3 className="text-4xl font-serif mb-4 leading-tight">Итоги вашего дня</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-10 max-w-xs mx-auto">
            Прекрасная работа! Вы сделали еще один шаг к лучшей версии себя.
          </p>

          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-[32px] p-8 mb-10 border border-neutral-100 dark:border-neutral-800 transition-all">
            <div className="flex justify-between items-end mb-4">
              <div className="text-left">
                <div className="text-3xl font-serif text-sprout-olive dark:text-white">
                  {finishedHabits.length} из {habits.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mt-1">Привычек выполнено</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-sprout-olive dark:text-white">{Math.round(progressPercent)}%</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mt-1">Прогресс</div>
              </div>
            </div>
            
            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                className="h-full bg-gradient-to-r from-sprout-olive to-emerald-400"
              />
            </div>
          </div>

          <div className="space-y-4 mb-10">
            {finishedHabits.slice(0, 3).map((h, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + (i * 0.1) }}
                key={h.id} 
                className="flex items-center gap-3 text-sm font-medium text-neutral-600 dark:text-neutral-300"
              >
                <div className="w-6 h-6 bg-sprout-olive/10 rounded-full flex items-center justify-center text-[10px] text-sprout-olive font-bold">
                  ✓
                </div>
                {h.name}
              </motion.div>
            ))}
            {finishedHabits.length > 3 && (
              <div className="text-xs text-neutral-400 font-medium pl-9">
                и еще {finishedHabits.length - 3} привычки...
              </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-sprout-olive text-white rounded-[24px] py-5 font-bold text-lg hover:shadow-xl hover:shadow-sprout-olive/20 active:scale-95 transition-all shadow-lg"
          >
            Продолжить путь
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateHabitModal({ onClose, addToast, onCreated }: { onClose: () => void, addToast: (msg: string, type?: 'success' | 'error' | 'info') => void, onCreated: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('other');
  const [hasTarget, setHasTarget] = useState(true);
  const [target, setTarget] = useState(7);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderDays, setReminderDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [showReminders, setShowReminders] = useState(false);

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.createHabit({ 
        name, 
        description: desc, 
        frequency: 'daily', 
        targetStreak: hasTarget ? target : 0,
        category,
        reminderTime: showReminders ? reminderTime : undefined,
        reminderDays: showReminders ? JSON.stringify(reminderDays) : undefined
      });
      addToast('Привычка создана! В добрый путь.');
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Ошибка при создании', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setReminderDays(prev => 
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const getAiHelp = async () => {
    if (!name) return;
    setLoading(true);
    const suggestions = await api.aiBreakdown(name);
    setAiSuggestions(suggestions);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-sprout-olive/20 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-white dark:bg-sprout-dark-card rounded-[40px] p-6 sm:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-neutral-400 hover:text-neutral-600 transition-colors">
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 rotate-45" />
        </button>

        <h3 className="text-3xl sm:text-4xl mb-6 sm:mb-8 font-serif">Новая привычка</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 ml-2">Что вы хотите начать делать?</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sprout-input text-lg" 
                placeholder="Напр: Чтение книг"
              />
              <button 
                onClick={getAiHelp}
                className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-2xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                title="Помощь ИИ"
              >
                <Sparkles className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2.5 ml-2">Категория привычки</label>
            <div className="grid grid-cols-2 xs:flex xs:flex-wrap gap-2">
              {Object.entries(CATEGORY_MAP).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border",
                    category === key
                      ? "bg-sprout-olive text-white border-transparent shadow-lg shadow-sprout-olive/20"
                      : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-100 dark:border-neutral-700 hover:border-neutral-300"
                  )}
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 ml-2">
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Цель серии (дней)</label>
              <button 
                onClick={() => setHasTarget(!hasTarget)}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-colors",
                  hasTarget ? "bg-sprout-olive dark:bg-white dark:text-neutral-900 text-white" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                )}
              >
                {hasTarget ? 'Включено' : 'Отключено'}
              </button>
            </div>
            {hasTarget && (
              <input 
                type="number" 
                value={Number.isNaN(target) ? '' : target}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTarget(Number.isNaN(val) ? 0 : val);
                }}
                className="w-full sprout-input text-lg" 
                min={1}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2 ml-2">Описание (опционально)</label>
            <textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full sprout-input min-h-[100px] text-lg" 
              placeholder="Почему это важно для вас?"
            />
          </div>

          <div className="pt-2">
            <button 
              onClick={() => setShowReminders(!showReminders)}
              className="flex items-center gap-2 text-sm font-bold text-sprout-olive dark:text-neutral-400 mb-4 ml-2"
            >
              <Bell className="w-4 h-4" />
              {showReminders ? 'Скрыть напоминания' : 'Добавить напоминания'}
            </button>

            <AnimatePresence>
              {showReminders && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4"
                >
                  <div className="bg-neutral-50 dark:bg-neutral-800/30 p-6 rounded-3xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Время</label>
                        <input 
                          type="time" 
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="sprout-input w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Дни недели</label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day, idx) => (
                          <button
                            key={day}
                            onClick={() => toggleDay(idx)}
                            className={cn(
                              "w-10 h-10 rounded-xl font-bold transition-all",
                              reminderDays.includes(idx) ? "bg-sprout-olive text-white shadow-md shadow-sprout-olive/20" : "bg-white dark:bg-neutral-800 text-neutral-400 border border-neutral-100 dark:border-neutral-700"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {aiSuggestions.length > 0 && (
            <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-3xl p-6 border border-purple-100 dark:border-purple-900/20">
              <h4 className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-serif text-xl mb-4">
                <BrainCircuit className="w-5 h-5" />
                Рекомендация Sprout AI
              </h4>
              <div className="space-y-3">
                {aiSuggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setName(s.name);
                      setDesc(s.description);
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 hover:border-purple-300 transition-all group"
                  >
                    <div className="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 dark:text-white">{s.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            disabled={loading || !name}
            onClick={handleCreate}
            className="w-full sprout-button py-4 text-xl shadow-lg shadow-sprout-olive/20"
          >
            {loading ? 'Секунду...' : 'Начать путешествие'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


