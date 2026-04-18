import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, BookOpen, Cpu, Globe, ArrowRight, Phone, MessageCircle, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { ThreeScene } from './components/ThreeScene';
import { ChatInterface } from './components/ChatInterface';
import { cn } from './lib/utils';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [showAdmin, setShowAdmin] = useState(false);

  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

  const contacts = [
    { number: '0113769994', type: 'both' },
    { number: '0116805544', type: 'both' },
    { number: '0991200000', type: 'both' },
    { number: '0912605808', type: 'whatsapp' },
  ];

  return (
    <div 
      className={cn(
        "min-h-screen relative overflow-x-hidden font-sans selection:bg-neon-green selection:text-nile-deep",
        lang === 'ar' ? "rtl" : "ltr"
      )}
      dir={lang === 'ar' ? "rtl" : "ltr"}
    >
      <ThreeScene />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-10 h-10 bg-neon-green rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(57,255,20,0.4)]">
            <Cpu className="text-nile-deep" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            {lang === 'ar' ? 'مستقبل AI' : 'Mustaqbal AI'}
          </span>
        </motion.div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLang}
            className="glass px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-all border-white/10"
          >
            <Languages size={18} className="text-neon-green" />
            <span className="text-sm font-medium">
              {lang === 'ar' ? 'English' : 'العربية'}
            </span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-20 flex flex-col lg:flex-row items-center gap-12 min-h-screen">
        <div className="flex-1 space-y-8 text-center lg:text-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs font-bold uppercase tracking-widest mb-4">
              {lang === 'ar' ? 'الجيل القادم من التعليم' : 'Next Gen Education'}
            </span>
            <h1 className="font-display text-5xl lg:text-7xl font-bold leading-tight">
              {lang === 'ar' ? (
                <>
                  تعلم <span className="text-neon-green text-glow">الذكاء</span> <br />
                  بطريقة <span className="text-desert-gold italic">مختلفة</span>
                </>
              ) : (
                <>
                  Learn <span className="text-neon-green text-glow">AI</span> <br />
                  The <span className="text-desert-gold italic">Cool</span> Way
                </>
              )}
            </h1>
            <p className="text-white/60 text-lg max-w-xl mx-auto lg:mx-0 mt-6 leading-relaxed">
              {lang === 'ar' 
                ? 'منصة تعليمية ذكية لطلاب الشهادة السودانية. بنشرح ليك الفيزياء والكيمياء بأمثلة من الكورة والجيمنج عشان المعلومة تثبت.'
                : 'A smart platform for Sudanese high schoolers. We explain Physics & Chemistry using Football and Gaming analogies so you never forget.'}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="glass-gold p-6 rounded-3xl space-y-3 group hover:bg-desert-gold/10 transition-all">
              <div className="w-12 h-12 bg-desert-gold/20 rounded-2xl flex items-center justify-center">
                <BookOpen className="text-desert-gold" />
              </div>
              <h3 className="font-bold">{lang === 'ar' ? 'شرح ممتع' : 'Fun Explanations'}</h3>
              <p className="text-sm text-white/50">{lang === 'ar' ? 'أمثلة من واقعك اليومي' : 'Real-life Sudanese analogies'}</p>
            </div>
            <div className="glass p-6 rounded-3xl space-y-3 group hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-neon-green/20 rounded-2xl flex items-center justify-center">
                <Globe className="text-neon-green" />
              </div>
              <h3 className="font-bold">{lang === 'ar' ? 'أدوات الذكاء' : 'AI Tools'}</h3>
              <p className="text-sm text-white/50">{lang === 'ar' ? 'تعلم كيف تستخدم الـ AI' : 'Master the tools of the future'}</p>
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex-1 w-full flex justify-center lg:justify-end"
        >
          <ChatInterface lang={lang} />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-white/30 text-sm">
          © 2026 Mustaqbal AI. Built for Sudan.
        </p>
        <button 
          onClick={() => setShowAdmin(true)}
          className="flex items-center gap-2 text-neon-green/60 text-sm font-medium hover:text-neon-green transition-colors group"
        >
          <span>{lang === 'ar' ? 'تواصل مع إدارة المدرسة' : 'Connect to School Administration'}</span>
          <ArrowRight size={16} className={cn("transition-transform", lang === 'ar' ? "group-hover:-translate-x-1 rotate-180" : "group-hover:translate-x-1")} />
        </button>
      </footer>

      {/* Admin Contact Modal */}
      <AnimatePresence>
        {showAdmin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdmin(false)}
              className="absolute inset-0 bg-nile-deep/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass rounded-3xl p-8 shadow-2xl border-white/10"
            >
              <button 
                onClick={() => setShowAdmin(false)}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-display font-bold text-neon-green">
                  {lang === 'ar' ? 'إدارة المدرسة' : 'School Administration'}
                </h2>
                <p className="text-white/50 text-sm">
                  {lang === 'ar' ? 'نحن هنا للإجابة على استفساراتكم' : 'We are here to answer your questions'}
                </p>
              </div>

              <div className="space-y-4">
                {contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <span className="font-mono text-lg tracking-wider">{c.number}</span>
                    <div className="flex gap-2">
                      {c.type === 'both' && (
                        <a href={`tel:${c.number}`} className="p-2 bg-neon-green/20 text-neon-green rounded-lg hover:bg-neon-green hover:text-nile-deep transition-all">
                          <Phone size={18} />
                        </a>
                      )}
                      <a 
                        href={`https://wa.me/${c.number.replace(/^0/, '249')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-neon-green/20 text-neon-green rounded-lg hover:bg-neon-green hover:text-nile-deep transition-all"
                      >
                        <MessageCircle size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-xs text-white/30">
                {lang === 'ar' ? 'الصافية شمال مربع 7 - المبني رقم 211' : 'Al-Safia North Square 7 - Building No. 211'}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Analytics />
    </div>
  );
}
