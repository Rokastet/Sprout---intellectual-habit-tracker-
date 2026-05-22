import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Send, 
  Trash2, 
  Sparkles, 
  User,
  Heart,
  HelpCircle,
  BookOpen,
  Compass,
  Smile,
  Zap,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../lib/api';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { text: 'Мне лень делать привычки сегодня', emoji: '🥱', color: 'hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-amber-950/10' },
  { text: 'Нет энергии и сильная усталость', emoji: '🔋', color: 'hover:border-rose-400 hover:bg-rose-50/20 dark:hover:bg-rose-950/10' },
  { text: 'Боюсь, что ничего не получится', emoji: '🧠', color: 'hover:border-purple-400 hover:bg-purple-50/20 dark:hover:bg-purple-950/10' },
  { text: 'Совсем нет свободного времени', emoji: '⏱️', color: 'hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/10' },
  { text: 'Хочу бросить все свои привычки', emoji: '🌱', color: 'hover:border-emerald-400 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10' },
];

const COGNITIVE_DISTORTIONS = [
  {
    title: 'Все или ничего',
    desc: '«Либо я делаю тренировку идеально целый час, либо нет смысла даже начинать».',
    reframing: '«Любая активность лучше её полного отсутствия. Даже 5 минут зарядки сегодня поддержат синаптическую связь моей привычки».',
  },
  {
    title: 'Катастрофизация',
    desc: '«Я пропустил два дня, теперь вся цепочка разрушена, я никогда не изменюсь».',
    reframing: '«Пропуск — это не крах, а просто единичное событие. Важно просто вернуться в строй сегодня. Правило Sprout: никогда не пропускать дважды подряд».',
  },
  {
    title: 'Сверхобобщение',
    desc: '«У меня вечно ничего не получается с привычками, я просто ленивый».',
    reframing: '«Раньше у меня были сложности, но сейчас у меня есть Sprout и поддержка коуча. Я учусь действовать микро-шагами».',
  }
];

export function CbtCoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reframing' | 'techniques'>('reframing');
  const [selectedDistortion, setSelectedDistortion] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat session if persists
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sprout_cbt_coach_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // Welcoming starter message
        setMessages([
          {
            role: 'model',
            content: `Привет! Я твой персональный **Sprout КПТ-Коуч**. 🌿\n\nКогда опускаются руки, лень идти к целям или накатывает усталость, я помогу разложить мысли по полочкам с помощью научных методов **когнитивно-поведенческой терапии (КПТ)**.\n\nВместе мы выявим мешающие автоматические мысли и найдём вдохновение для маленьких, но уверенных шагов. Расскажи мне, с какой трудностью ты столкнулся прямо сейчас, или воспользуйся быстрой подсказкой выше!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (e) {
      console.error('Failed to parse chat logs:', e);
    }
  }, []);

  // Sync messages into LocalStorage
  const saveMessages = (updated: Message[]) => {
    setMessages(updated);
    try {
      localStorage.setItem('sprout_cbt_coach_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save chat logs:', e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    setError(null);
    setInput('');
    setLoading(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { role: 'user', content: text, timestamp: timeStr };
    const currentHistory = [...messages, userMsg];
    
    saveMessages(currentHistory);

    try {
      const apiHistory = currentHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.aiCoach(text, apiHistory);
      
      const modelTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const coachMsg: Message = {
        role: 'model',
        content: res.reply,
        timestamp: modelTime
      };

      saveMessages([...currentHistory, coachMsg]);
    } catch (err: any) {
      console.error('CBT Coach interaction failed:', err);
      setError('Не удалось получить совет от коуча. Пожалуйста, проверьте соединение. Я всегда рядом, чтобы поддержать вас!');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Вы действительно хотите очистить всю историю чата с КПТ-коучем?')) {
      const resetMessages: Message[] = [
        {
          role: 'model',
          content: 'История чата бережно очищена. Помните: каждый день — это новое начало. 🌱 С какой мыслью или трудностью вы хотите поработать сегодня?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      saveMessages(resetMessages);
      setError(null);
    }
  };

  // Safe formatting parsing helper
  const renderTextWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-emerald-950 dark:text-white dark:bg-white/5 px-0.5">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const parseMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={index} className="h-2.5" />;
      }

      // Render blockquotes or CBT emphasis
      if (trimmed.startsWith('> ')) {
        const cleanLine = trimmed.substring(2);
        return (
          <blockquote key={index} className="border-l-3 border-sprout-olive/30 dark:border-emerald-500/30 pl-3.5 py-1.5 my-3 italic text-stone-605 dark:text-neutral-400 text-sm font-serif leading-relaxed">
            {renderTextWithBold(cleanLine)}
          </blockquote>
        );
      }

      // Render bullet list items as premium, non-bulky checklist rows
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        const cleanLine = trimmed.replace(/^[-*]\s|^\d+\.\s/, '');
        return (
          <div key={index} className="flex items-start gap-2.5 my-2 pl-2.5 py-0.5 border-l-2 border-sprout-olive/15 dark:border-white/10">
            <span className="mt-1 flex-shrink-0 text-sprout-olive/60 dark:text-emerald-400 text-[10px] select-none">✦</span>
            <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-stone-650 dark:text-neutral-350 font-sans tracking-wide">
              {renderTextWithBold(cleanLine)}
            </p>
          </div>
        );
      }

      // Render headings
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={index} className="text-[11px] font-sans font-bold text-sprout-olive/80 dark:text-emerald-400 uppercase tracking-widest mt-4.5 mb-1.5 flex items-center gap-1.5 select-none">
            <span className="w-1 h-1 rounded-full bg-sprout-olive dark:bg-emerald-400"></span>
            {renderTextWithBold(trimmed.substring(4))}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={index} className="text-base sm:text-[17px] font-serif font-semibold italic text-emerald-950 dark:text-emerald-100 mt-5 mb-2.5 pb-1 border-b border-stone-100/60 dark:border-neutral-800/60 leading-tight">
            {renderTextWithBold(trimmed.substring(3))}
          </h3>
        );
      }

      return (
        <p key={index} className="text-[14px] sm:text-[14.5px] leading-relaxed text-stone-700 dark:text-neutral-300 mb-2 font-sans tracking-wide">
          {renderTextWithBold(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      {/* LEFT: Gorgeous Interactive Chat Container */}
      <div className="lg:col-span-2 bg-white dark:bg-sprout-dark-card border border-sprout-soft/80 dark:border-sprout-dark-border rounded-[32px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.02)] flex flex-col h-[680px] transition-all duration-300">
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-sprout-soft/30 to-transparent dark:from-sprout-dark-border/40 dark:to-transparent border-b border-sprout-soft dark:border-sprout-dark-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sprout-olive dark:bg-white text-white dark:text-sprout-olive rounded-2xl shadow-sm relative overflow-hidden group">
              <span className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
              <BrainCircuit className="w-6 h-6 animate-pulse relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 dark:text-white leading-tight">
                  Sprout ИИ-Коуч
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-sprout-soft text-sprout-olive dark:bg-emerald-950/40 dark:text-emerald-300 border border-sprout-olive/10">
                  КПТ ПОДДЕРЖКА
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">
                Анализирует вашу статистику за последние 14 дней для поиска решений
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            title="Очистить историю чата"
            className="p-3 hover:bg-stone-100 dark:hover:bg-neutral-800 rounded-2xl text-stone-400 hover:text-red-500 transition-all cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Suggested interactive chips */}
        <div className="px-6 py-4 bg-stone-50/40 dark:bg-neutral-900/30 border-b border-sprout-soft dark:border-sprout-dark-border">
          <div className="text-xs font-bold text-stone-400 dark:text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
            <HelpCircle className="w-3.5 h-3.5 text-sprout-olive" />
            <span>Выберите частую проблему или опишите её ниже:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 custom-scrollbar">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                disabled={loading}
                onClick={() => handleSend(qp.text)}
                className={`flex-shrink-0 px-3.5 py-1.5 bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 hover:border-sprout-olive dark:hover:border-white rounded-full text-xs font-medium text-stone-700 dark:text-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${qp.color} hover:translate-y-[-1px] hover:shadow-2xs`}
              >
                <span>{qp.emoji}</span>
                <span>{qp.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic chat thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-stone-50/10 dark:bg-transparent custom-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => {
              const isModel = m.role === 'model';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`flex gap-3 max-w-[88%] ${isModel ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Subtle Elegant Avatar */}
                  <div className={`sm:flex flex-shrink-0 items-center justify-center w-8.5 h-8.5 rounded-full ${isModel ? 'bg-sprout-olive text-white dark:bg-white dark:text-sprout-olive' : 'bg-stone-200 dark:bg-neutral-800 text-stone-600 dark:text-neutral-300'} hidden shadow-2xs`}>
                    {isModel ? <Heart className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Elegant Bubble */}
                  <div className="space-y-1 group">
                    <div className={`p-4.5 rounded-[22px] text-sm leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${
                      isModel 
                        ? 'bg-[#FCFDFD] dark:bg-neutral-800 text-stone-800 dark:text-neutral-100 rounded-tl-none border border-stone-100 dark:border-sprout-dark-border/40' 
                        : 'bg-sprout-olive dark:bg-white text-white dark:text-stone-900 rounded-tr-none font-sans px-5'
                      }`}
                    >
                      {isModel ? (
                        <div className="space-y-1">{parseMessageContent(m.content)}</div>
                      ) : (
                        <p className="whitespace-pre-wrap font-sans text-sm sm:text-[14.5px] font-medium leading-relaxed">{m.content}</p>
                      )}
                    </div>
                    <div className={`text-[10px] text-stone-400 dark:text-neutral-500 font-mono tracking-wider px-1 ${isModel ? 'text-left' : 'text-right'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-[85%] mr-auto"
              >
                <div className="flex flex-shrink-0 items-center justify-center w-8.5 h-8.5 rounded-full bg-sprout-olive text-white dark:bg-white dark:text-sprout-olive animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-white dark:text-sprout-olive" />
                </div>
                <div className="p-4 bg-[#FCFDFD] dark:bg-neutral-800 rounded-[22px] rounded-tl-none border border-stone-100 dark:border-sprout-dark-border/40 flex items-center gap-3">
                  <div className="flex space-x-1.5 flex-shrink-0">
                    <span className="w-2 h-2 bg-sprout-olive dark:bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-sprout-olive dark:bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-sprout-olive dark:bg-white rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[13px] text-stone-500 dark:text-neutral-300 font-sans italic my-0.5">
                    Коуч анализирует цепочки привычек и подбирает КПТ-рефрейминг...
                  </span>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-50/60 dark:bg-red-950/10 text-red-700 dark:text-red-400 text-xs sm:text-sm rounded-2xl border border-red-100 dark:border-red-900/20 flex flex-col sm:flex-row gap-3 items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button 
                  onClick={() => handleSend(messages[messages.length - 1]?.content || '')}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-xl text-xs font-bold transition-all text-red-800 dark:text-red-200 cursor-pointer"
                >
                  Попробовать снова
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="p-4 bg-white dark:bg-sprout-dark-card border-t border-sprout-soft dark:border-sprout-dark-border flex gap-3 items-center"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Расскажите коучу, о чём вы переживаете или почему лень сегодня..."
              className="w-full text-sm py-4 pl-4 pr-16 bg-stone-50/50 dark:bg-neutral-900/40 focus:bg-white dark:focus:bg-neutral-900 border border-stone-200 dark:border-neutral-700 focus:border-sprout-olive dark:focus:border-white rounded-2xl outline-none text-stone-850 dark:text-neutral-100 transition-all disabled:opacity-65"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-450 flex items-center gap-1 cursor-default select-none">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-sprout-soft text-sprout-olive dark:bg-neutral-800 dark:text-neutral-400 rounded-md">
                КПТ-ИИ
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-4 bg-sprout-olive dark:bg-white text-white dark:text-sprout-olive rounded-2xl transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 border-t border-sprout-soft dark:border-sprout-dark-border bg-stone-50/60 dark:bg-neutral-950/20 text-[10px] text-stone-400 dark:text-neutral-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-1">
          <span className="flex items-center gap-1">
            <span>⚙️</span> Системный анализ: активность, настроение и ведение дневника за последние 14 дней
          </span>
          <span className="text-sprout-olive dark:text-neutral-400">
            Метод: Когнитивно-Поведенческая Терапия (КПТ)
          </span>
        </div>
      </div>

      {/* RIGHT: Beautiful Interactive CBT Theory & Reframe Toolkit (Bento style) */}
      <div className="bg-white dark:bg-sprout-dark-card border border-sprout-soft/80 dark:border-sprout-dark-border rounded-[32px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.02)] flex flex-col h-[680px]">
        {/* Toggle Nav Tabs */}
        <div className="grid grid-cols-2 border-b border-sprout-soft dark:border-sprout-dark-border text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('reframing')}
            className={`py-4 px-2 text-center font-medium border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'reframing' 
                ? 'border-sprout-olive text-sprout-olive dark:border-white dark:text-white bg-sprout-soft/20 dark:bg-white/5 font-semibold' 
                : 'border-transparent text-stone-400 dark:text-neutral-500 hover:text-stone-700 dark:hover:text-neutral-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Когнитивные искажения</span>
          </button>
          <button
            onClick={() => setActiveTab('techniques')}
            className={`py-4 px-2 text-center font-medium border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'techniques' 
                ? 'border-sprout-olive text-sprout-olive dark:border-white dark:text-white bg-sprout-soft/20 dark:bg-white/5 font-semibold' 
                : 'border-transparent text-stone-400 dark:text-neutral-500 hover:text-stone-700 dark:hover:text-neutral-300'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Техники КПТ</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {activeTab === 'reframing' ? (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-sprout-soft/50 to-transparent dark:from-sprout-dark-border/20 dark:to-transparent p-4 rounded-2xl border border-sprout-soft/60 dark:border-sprout-dark-border/50">
                <h4 className="font-serif font-bold text-base text-sprout-olive dark:text-emerald-400 mb-2 flex items-center gap-2">
                  <Smile className="w-5 h-5" /> Что за ловушки ума?
                </h4>
                <p className="text-xs text-stone-600 dark:text-neutral-300 leading-relaxed font-sans">
                  Наш мозг устроен так, чтобы экономить энергию. Сталкиваясь с нагрузкой, он подсовывает автоматические защитные домыслы. КПТ учит видеть их и рефреймить — превращать ложные страхи в мягкие реалистичные действия.
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                  Частые искажения в привычках
                </h5>
                
                {COGNITIVE_DISTORTIONS.map((cd, index) => {
                  const isSelected = selectedDistortion === index;
                  return (
                    <div 
                      key={index}
                      onClick={() => setSelectedDistortion(isSelected ? null : index)}
                      className={`border rounded-2xl p-4 transition-all duration-300 cursor-pointer select-none ${
                        isSelected 
                          ? 'border-sprout-olive dark:border-white bg-sprout-soft/10 dark:bg-neutral-800/20 shadow-xs' 
                          : 'border-stone-100 dark:border-neutral-800 hover:border-stone-200 dark:hover:border-neutral-750 hover:bg-stone-50/40 dark:hover:bg-neutral-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-stone-850 dark:text-neutral-200 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-sprout-olive/10 dark:bg-white/10 flex items-center justify-center text-[11px] text-sprout-olive dark:text-sprout-dark-text font-bold">
                            {index + 1}
                          </span>
                          {cd.title}
                        </span>
                        <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${isSelected ? 'rotate-90 text-sprout-olive dark:text-white' : ''}`} />
                      </div>
                      
                      <AnimatePresence initial={false}>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-3 mt-3 border-t border-stone-100 dark:border-neutral-800 space-y-3">
                              <div>
                                <span className="text-[10px] font-bold text-red-400 dark:text-red-300 uppercase tracking-wider block">Ловушка:</span>
                                <p className="text-xs text-stone-500 dark:text-neutral-400 italic mt-0.5">{cd.desc}</p>
                              </div>
                              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/20">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">КПТ Рефрейминг:</span>
                                <p className="text-xs text-stone-700 dark:text-neutral-300 font-medium mt-1 leading-relaxed">{cd.reframing}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* CBT habit technique 1 */}
              <div className="border border-stone-150 dark:border-neutral-800 rounded-2xl p-5 space-y-3 hover:shadow-xs transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌱</span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-850 dark:text-neutral-200">Двухминутная версия</h4>
                    <span className="text-[10px] font-medium text-sprout-olive dark:text-emerald-400 uppercase tracking-widest block">Техника снижения трения</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed font-sans">
                  Когда лень делать большую задачу (например, учить язык 30 минут) — опустите планку входа до 2 минут. Откройте приложение, посмотрите ровно одно новое слово. Таким образом вы поддержите нейронную цепочку и сохраните непрерывность streak без истощения силы воли.
                </p>
              </div>

              {/* CBT habit technique 2 */}
              <div className="border border-stone-150 dark:border-neutral-800 rounded-2xl p-5 space-y-3 hover:shadow-xs transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧘‍♀️</span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-850 dark:text-neutral-200">Рефлексия настроения</h4>
                    <span className="text-[10px] font-medium text-sprout-olive dark:text-emerald-400 uppercase tracking-widest block">Осознанная корреляция</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed font-sans">
                  Каждый раз при выполнении или пропуске привычки кратко записывайте эмоцию в дневник (грусть, энтузиазм, усталость). Интеллектуальный анализатор соберет эти взаимосвязи и расскажет вам закономерности, помогая лучше узнать свои внутренние циклы.
                </p>
              </div>

              {/* CBT habit technique 3 */}
              <div className="border border-stone-150 dark:border-neutral-800 rounded-2xl p-5 space-y-3 hover:shadow-xs transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h4 className="text-sm font-bold text-stone-850 dark:text-neutral-200">Правило «Никогда не дважды»</h4>
                    <span className="text-[10px] font-medium text-sprout-olive dark:text-emerald-400 uppercase tracking-widest block">Защита от срыва</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-neutral-400 leading-relaxed font-sans">
                  Один пропуск — это случайная случайность, но два пропуска подряд — это формирование новой альтернативной привычки «не делать». В случае форс-мажора всегда используйте накопленную «заморозку» или делайте двухминутную версию, но не пропускайте повторно.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Support Quote Card */}
        <div className="p-6 bg-stone-50 dark:bg-neutral-900/50 border-t border-sprout-soft dark:border-sprout-dark-border text-center">
          <p className="text-xs text-stone-500 dark:text-neutral-400 italic font-serif">
            «Каждое маленькое действие — это ваш залог верности той личности, которой вы мечтаете стать».
          </p>
          <span className="text-[10px] text-stone-400 block mt-1.5 font-sans">- Джеймс Клир</span>
        </div>
      </div>
    </div>
  );
}
