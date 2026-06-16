import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle, 
  Brain, 
  ChevronRight,
  TrendingUp,
  Smile,
  Frown,
  Meh,
  Zap,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: number;
  interval: number;
  next_review_date: string;
}

export default function StudySession() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('next_review_date', { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const currentCard = cards[currentIndex];

  const handleReview = async (quality: number) => {
    if (!currentCard) return;

    // SM-2 Logic
    let newDifficulty = currentCard.difficulty || 2.5;
    let newInterval = currentCard.interval || 0;
    
    // Update difficulty
    newDifficulty = newDifficulty + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newDifficulty < 1.3) newDifficulty = 1.3;

    if (quality >= 3) {
      if (newInterval === 0) newInterval = 1;
      else if (newInterval === 1) newInterval = 6;
      else newInterval = Math.round(newInterval * newDifficulty);
      setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      newInterval = 1;
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);

    try {
      await supabase
        .from('flashcards')
        .update({
          difficulty: newDifficulty,
          interval: newInterval,
          next_review_date: nextDate.toISOString()
        })
        .eq('id', currentCard.id);

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
      } else {
        setSessionComplete(true);
      }
    } catch (err) {
      console.error('Update Error:', err);
    }
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 cyberpunk:bg-black text-slate-500 dark:text-slate-400 font-bold animate-pulse gap-4">
    <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    Preparing your brain...
  </div>;

  if (cards.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 cyberpunk:bg-black p-8 text-center space-y-6">
       <div className="w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mb-2">
         <RotateCcw size={40} className="text-slate-400 dark:text-slate-600" />
       </div>
       <h2 className="text-2xl font-black text-slate-900 dark:text-white-cyberpunk:text-emerald-400 uppercase tracking-tight">No cards in this deck.</h2>
       <button onClick={() => navigate(-1)} className="bg-sky-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-600 transition shadow-lg shadow-sky-500/20 active:scale-95">Go Back</button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 cyberpunk:bg-black text-slate-950 dark:text-white overflow-hidden transition-colors mobile-hardened">
      {/* Header */}
      <div
        className="p-4 glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/60 border-b border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 flex items-center justify-between z-20"
      >
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center glass-premium border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-500 hover:text-sky-500 transition group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex items-center gap-2.5">
           <div className="bg-sky-500/10 p-2 rounded-lg text-sky-500 glow-sky">
              <Brain size={20} />
           </div>
           <span className="font-black text-[10px] md:text-xs tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500">Active Recall Session</span>
        </div>
        <div className="text-[10px] md:text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800 uppercase tracking-widest">
           <span className="text-sky-500">{currentIndex + 1}</span> <span className="opacity-30">/</span> {cards.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-900 cyberpunk:bg-emerald-950/20 z-10">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${((currentIndex + (sessionComplete ? 1 : 0)) / cards.length) * 100}%` }}
             className="h-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.6)]" 
           />
        </div>

        <AnimatePresence mode="wait">
          {!sessionComplete ? (
            <motion.div 
              key={currentIndex}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -20 }}
              className="w-full max-w-lg aspect-[3/4] md:aspect-[4/3] relative perspective-1000 group cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`relative w-full h-full transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front */}
                <div className="absolute inset-0 backface-hidden glass-premium bg-white/40 dark:bg-slate-900/40 cyberpunk:bg-black/40 border-2 border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 rounded-[3rem] flex flex-col items-center justify-center p-8 md:p-14 text-center shadow-2xl group-hover:border-sky-500/50 transition-all duration-300">
                  <div className="absolute top-10 left-10 text-[10px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-[0.2em] bg-sky-500/10 border border-sky-500/20 px-4 py-2 rounded-full animate-pulse">Question</div>
                  <Sparkles className="absolute top-10 right-10 text-sky-500/20" size={24} />
                  <p className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-tight">{currentCard.front}</p>
                  <div className="absolute bottom-12 flex flex-col items-center gap-2">
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-sky-500 transition-colors">Tap to Reveal Answer</p>
                    <div className="w-1.5 h-1.5 bg-sky-500/30 rounded-full group-hover:bg-sky-500 group-hover:scale-150 transition-all duration-300" />
                  </div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 glass-premium bg-slate-950/90 dark:bg-slate-900/90 cyberpunk:bg-emerald-950/40 border-2 border-sky-500/50 dark:border-sky-500/50 cyberpunk:border-emerald-500/50 rounded-[3rem] flex flex-col items-center justify-center p-8 md:p-14 text-center shadow-2xl overflow-hidden">
                  <div className="absolute top-10 left-10 text-[10px] font-black text-amber-400 h-8 flex items-center uppercase tracking-[0.2em] bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full">Reveal</div>
                  <Brain className="absolute top-10 right-10 text-sky-400/30" size={24} />
                  <div className="w-full overflow-y-auto max-h-[70%] custom-scrollbar pr-2 relative z-10">
                    <p className="text-xl md:text-3xl text-white dark:text-white-cyberpunk:text-emerald-300 leading-snug font-bold">{currentCard.back}</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent pointer-events-none opacity-50" />
                </div>

              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center space-y-10 glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/60 p-10 md:p-14 rounded-[3.5rem] border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 shadow-2xl max-w-md w-full"
            >
               <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-emerald-500/20 relative">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                  <CheckCircle size={48} className="text-emerald-500 relative z-10" />
               </div>
               <div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2 uppercase tracking-tight">Session Complete!</h2>
                 <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">Great work. Your brain is getting stronger.</p>
               </div>
               <div className="flex justify-center gap-10">
                  <div className="text-center group">
                    <div className="flex items-center justify-center gap-2 text-3xl font-black text-sky-500 dark:text-sky-400">
                      <TrendingUp size={24} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-[0.2em] mt-2">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-emerald-500 dark:text-emerald-400">{stats.correct}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-[0.2em] mt-2">Mastered</div>
                  </div>
               </div>
               <button 
                 onClick={() => navigate(-1)}
                 className="w-full bg-slate-900 dark:bg-sky-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition shadow-2xl shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-3 hover:opacity-90"
               >
                 Keep Going <ChevronRight size={18} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls Bar */}
      <AnimatePresence>
        {isFlipped && !sessionComplete && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="p-6 pb-10 glass-premium dark:bg-slate-900/80 cyberpunk:bg-black/80 border-t border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 flex items-center justify-center gap-3 max-w-lg mx-auto w-full md:rounded-t-[2.5rem] relative z-20"
          >
             <button 
               onClick={() => handleReview(0)}
               className="flex-1 flex flex-col items-center gap-2 bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 py-4 px-2 rounded-2xl transition-all duration-300 group active:scale-95"
             >
                <Frown className="text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-tighter opacity-70 group-hover:opacity-100">Again</span>
             </button>
             <button 
               onClick={() => handleReview(3)}
               className="flex-1 flex flex-col items-center gap-2 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 py-4 px-2 rounded-2xl transition-all duration-300 group active:scale-95"
             >
                <Meh className="text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-tighter opacity-70 group-hover:opacity-100">Hard</span>
             </button>
             <button 
               onClick={() => handleReview(4)}
               className="flex-1 flex flex-col items-center gap-2 bg-sky-500/5 dark:bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 dark:border-sky-500/30 py-4 px-2 rounded-2xl transition-all duration-300 group active:scale-95"
             >
                <Smile className="text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-sky-500 dark:text-sky-400 uppercase tracking-tighter opacity-70 group-hover:opacity-100">Good</span>
             </button>
             <button 
               onClick={() => handleReview(5)}
               className="flex-1 flex flex-col items-center gap-2 bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 py-4 px-2 rounded-2xl transition-all duration-300 group active:scale-95"
             >
                <Zap className="text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-tighter opacity-70 group-hover:opacity-100">Easy</span>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
