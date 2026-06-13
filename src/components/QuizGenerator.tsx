import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Brain, Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react';

interface QuizGeneratorProps {
  subject: string;
  topic: string;
  pdfBase64?: string;
  materialId?: string;
  fileUrl?: string;
  extractedText?: string;
  isGroupFile?: boolean;
  onClose: () => void;
  onGenerated: (quizId: string) => void;
}

export default function QuizGenerator({ 
  subject, 
  topic, 
  pdfBase64, 
  materialId,
  fileUrl,
  extractedText,
  isGroupFile,
  onClose, 
  onGenerated 
}: QuizGeneratorProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  const generateQuiz = async () => {
    setLoading(true);
    setErrorMsg('');
    
    try {
      // 1. Generate Questions (Call Edge Function)
      const { data, error: genError } = await supabase.functions.invoke('quiz-generator', {
        body: { 
          subject, 
          topic, 
          numQuestions, 
          difficulty, 
          pdfBase64, 
          materialId, 
          fileUrl,
          extractedText,
          isGroupFile 
        }
      });

      if (genError) {
        let errorMessage = genError.message;
        try {
          if (genError.context && typeof genError.context.json === 'function') {
            const errorBody = await genError.context.json();
            if (errorBody?.error) errorMessage = errorBody.error;
          }
        } catch {
          // Fallback to existing message
        }
        throw new Error(errorMessage || 'AI generation failed');
      }
      
      if (data?.error) throw new Error(data.error);

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format from AI generator');
      }

      // 2. Validate each question's structure
      // Edge function returns: { question, options, correct_index, explanation }
      const validatedQuestions = data.questions.filter((q: any) => {
        return (
          (typeof q.question === 'string' || typeof q.question_text === 'string') &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          (typeof q.correct_index === 'number' || typeof q.correct_option_index === 'number')
        );
      });

      if (validatedQuestions.length === 0) {
        throw new Error('AI failed to generate valid questions. Please try again.');
      }

      // 3. Create Quiz Entry
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert([{
          title: `${topic} Mastery Quiz`,
          description: `Generated quiz for ${subject} - ${topic}`,
          subject,
          topic,
          created_by: user?.id
        }])
        .select()
        .single();

      if (quizError) throw new Error(quizError.message || JSON.stringify(quizError));

      interface QuizQuestion {
        question?: string;
        question_text?: string;
        options: string[];
        correct_index?: number;
        correct_option_index?: number;
        explanation?: string;
      }

      // 4. Normalize field names to match DB schema: question, correct_index
      const preparedQuestions = (validatedQuestions as QuizQuestion[]).map((q) => ({
        quiz_id: quiz.id,
        question: q.question || q.question_text || '',
        options: q.options,
        correct_index: q.correct_index ?? q.correct_option_index ?? 0,
        explanation: q.explanation || ''
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(preparedQuestions);

      if (questionsError) throw new Error(questionsError.message || JSON.stringify(questionsError));

      onGenerated(quiz.id);
    } catch (err: unknown) {
      console.error("Quiz Generation Error:", err);
      let message = 'An unexpected error occurred while generating the quiz.';
      if (err instanceof Error) {
        message = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as Record<string, unknown>;
        message = (e.message as string) || (e.error as string) || JSON.stringify(err);
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="glass-premium bg-white/90 dark:bg-slate-900/90 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-700 border border-white/20">
        <div className="p-6 md:p-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 translate-x-12 -translate-y-8 group-hover:scale-110 group-hover:rotate-0 transition-transform duration-700">
            <Brain size={120} />
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-sky-500/30 transform transition-transform hover:scale-110 active:rotate-12 duration-300">
              <Brain size={32} className="md:w-10 md:h-10 glow-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5 uppercase">Neural Test</h2>
              <p className="text-[10px] md:text-[11px] text-sky-600 dark:text-sky-400 font-black uppercase tracking-[0.2em]">Artificial Intelligence Synthesis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all relative z-10 active:scale-90">
            <X size={26} />
          </button>
        </div>

        <div className="p-6 md:p-10 space-y-8 md:space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Context Matrix</label>
            <div className="p-5 glass-premium bg-slate-50/50 dark:bg-white/5 rounded-3xl border border-slate-200/50 dark:border-white/5 flex items-center gap-4 shadow-inner">
              <div className="w-3 h-3 rounded-full bg-sky-500 animate-pulse glow-sky shrink-0" />
              <span className="text-slate-900 dark:text-white font-black text-base md:text-lg tracking-tight truncate leading-none">
                {subject} <span className="text-slate-300 dark:text-slate-700 mx-2 text-sm">/</span> {topic}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Parameter Calibration</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
               <div className="space-y-3">
                 <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                 <div className="relative group/select">
                   <select 
                     value={difficulty} 
                     onChange={(e) => setDifficulty(e.target.value)}
                     className="w-full p-4.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 font-black text-slate-900 dark:text-white text-sm appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm uppercase tracking-widest pl-5"
                   >
                     <option value="easy">Novice</option>
                     <option value="medium">Advanced</option>
                     <option value="hard">Expert</option>
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                     <ChevronRight className="rotate-90" size={16} />
                   </div>
                 </div>
               </div>
               <div className="space-y-3">
                 <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-1">Sample Size</label>
                 <div className="relative group/select">
                   <select 
                     value={numQuestions} 
                     onChange={(e) => setNumQuestions(Number(e.target.value))}
                     className="w-full p-4.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 font-black text-slate-900 dark:text-white text-sm appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm uppercase tracking-widest pl-5"
                   >
                     <option value={5}>05 Units</option>
                     <option value={10}>10 Units</option>
                     <option value={15}>15 Units</option>
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                     <ChevronRight className="rotate-90" size={16} />
                   </div>
                 </div>
               </div>
            </div>
          </div>

          <div className="p-6 glass-premium bg-sky-50/50 dark:bg-sky-500/5 rounded-3xl border border-sky-100/50 dark:border-sky-500/10 flex items-start gap-3">
             <div className="text-sky-500 mt-0.5"><Sparkles size={16} /></div>
             <p className="text-xs leading-relaxed text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wide">
               AI will distill your intelligence assets into a high-density performance assessment. Results are recorded in your persistent matrix.
             </p>
          </div>

          {errorMsg && (
            <div className="p-5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest animate-shake flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full glow-red" />
              {errorMsg}
            </div>
          )}
        </div>

        <div className="p-6 md:p-10 pt-0">
          <button 
            onClick={generateQuiz}
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-sky-500 text-white py-5 md:py-6 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-black dark:hover:bg-sky-400 transition-all active:scale-[0.98] disabled:opacity-50 shadow-2xl group overflow-hidden relative"
          >
            {loading ? (
              <>
                <RefreshCw size={22} className="animate-spin text-sky-400 dark:text-white" />
                <span>Calibrating Neural Net...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-sky-400 dark:text-white group-hover:scale-125 transition-transform" />
                <span>Initialize Synthesis</span>
                <ChevronRight size={20} className="opacity-30 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
