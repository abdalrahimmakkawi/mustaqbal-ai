import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Trophy, Gamepad2, Zap, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTutorResponse, Vibe, ChatMessage } from '../services/aiService';

interface ChatInterfaceProps {
  lang: 'ar' | 'en';
}

const VIBES: { id: Vibe; icon: any; label: { ar: string; en: string } }[] = [
  { id: 'football', icon: Trophy, label: { ar: 'كورة', en: 'Football' } },
  { id: 'gaming', icon: Gamepad2, label: { ar: 'جيمنج', en: 'Gaming' } },
  { id: 'action', icon: Zap, label: { ar: 'أكشن', en: 'Action' } },
  { id: 'street', icon: MessageSquare, label: { ar: 'وناسة', en: 'Street' } },
];

export function ChatInterface({ lang }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [vibe, setVibe] = useState<Vibe>('football');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('Physics');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Add empty assistant message first
    setMessages(prev => [...prev, { role: 'model', text: '' }]);
    
    await getTutorResponse(subject, input, vibe, lang, messages, (delta) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'model') {
          updated[updated.length - 1] = { ...last, text: last.text + delta };
        }
        return updated;
      });
    });
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl glass rounded-3xl overflow-hidden shadow-2xl border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center border border-neon-green/30">
            <Bot className="text-neon-green w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">
              {lang === 'ar' ? 'يا أخويا AI' : 'Ya Akhoya AI'}
            </h3>
            <p className="text-xs text-white/50">
              {lang === 'ar' ? 'جاهز للفهم؟' : 'Ready to understand?'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {VIBES.map((v) => (
            <button
              key={v.id}
              onClick={() => setVibe(v.id)}
              className={cn(
                "p-2 rounded-xl transition-all duration-300 border",
                vibe === v.id 
                  ? "bg-neon-green text-nile-deep border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.3)]" 
                  : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10"
              )}
              title={lang === 'ar' ? v.label.ar : v.label.en}
            >
              <v.icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
            <Sparkles className="w-12 h-12 text-desert-gold animate-pulse" />
            <p className="font-display text-lg">
              {lang === 'ar' 
                ? 'أسألني عن أي موضوع في الفيزياء أو الكيمياء...' 
                : 'Ask me about any topic in Physics or Chemistry...'}
            </p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex w-full gap-3",
                m.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                m.role === 'user' ? "bg-desert-gold/20" : "bg-neon-green/20"
              )}>
                {m.role === 'user' ? <User size={16} className="text-desert-gold" /> : <Bot size={16} className="text-neon-green" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed",
                m.role === 'user' 
                  ? "bg-desert-gold/10 border border-desert-gold/20 rounded-tr-none" 
                  : "bg-white/5 border border-white/10 rounded-tl-none"
              )}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center animate-pulse">
              <Bot size={16} className="text-neon-green" />
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-neon-green/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-neon-green/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-neon-green/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={lang === 'ar' ? 'أكتب موضوعك هنا...' : 'Type your topic here...'}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-neon-green/50 transition-colors"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-neon-green text-nile-deep p-3 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
