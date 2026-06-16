import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  ChevronRight, 
  MessageSquare,
  RefreshCw,
  Home
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizView() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
    const { data: questionsData } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId);

    if (quizData) setQuiz(quizData);
    if (questionsData) setQuestions(questionsData);
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleAnswer = (index: number) => {
    if (answers[currentIndex] !== undefined) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = index;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResult(true);
      if (calculateScore() === questions.length) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const calculateScore = () => {
    return answers.reduce((score, ans, idx) => {
      return ans === questions[idx].correct_index ? score + 1 : score;
    }, 0);
  };

  if (loading) return <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400 font-bold animate-pulse">Loading Assessment...</div>;
  if (!quiz) return <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold">Quiz not found.</div>;

  if (showResult) {
    const score = calculateScore();
    const scorePercent = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/60 rounded-[2.5rem] shadow-2xl border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 overflow-hidden">
          <div className="bg-slate-900 dark:bg-slate-950 cyberpunk:bg-emerald-950/20 p-8 text-center text-white relative border-b border-slate-800 dark:border-slate-900 cyberpunk:border-emerald-500/20">
             <div className="absolute top-6 left-6">
               <Trophy className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" size={32} />
             </div>
             <h2 className="text-3xl font-black mb-1 cyberpunk:text-emerald-400 uppercase tracking-tight">Quiz Results</h2>
             <p className="text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-700 text-sm font-bold uppercase tracking-widest">{quiz.title}</p>
          </div>

          <div className="p-8 md:p-12 text-center space-y-10">
            <div className="relative inline-block scale-110">
               <svg className="w-32 h-32 transform -rotate-90">
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800 cyberpunk:text-emerald-950/30" />
                 <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * scorePercent) / 100} className="text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-500 transition-all duration-1000 ease-out" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400">{scorePercent}%</span>
               </div>
            </div>
<br/>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 cyberpunk:bg-emerald-500/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 cyberpunk:border-emerald-500/20 text-center">
                <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 cyberpunk:text-emerald-500">{score}</span>
                <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400/70 cyberpunk:text-emerald-700 tracking-widest">Correct</span>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 cyberpunk:bg-red-500/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/40 cyberpunk:border-red-500/20 text-center">
                <span className="block text-3xl font-black text-red-600 dark:text-red-400 cyberpunk:text-red-500">{questions.length - score}</span>
                <span className="text-[10px] uppercase font-black text-red-700 dark:text-red-400/70 cyberpunk:text-red-700 tracking-widest">Errors</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 glass-premium border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
              >
                <RefreshCw size={18} className="text-sky-500" /> Retry Quiz
              </button>
              <Link 
                to={`/organizer/${encodeURIComponent(quiz.subject)}/${encodeURIComponent(quiz.topic)}`}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-sky-500 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs hover:opacity-90 transition shadow-xl shadow-sky-500/20 active:scale-95"
              >
                <Home size={18} /> Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentIndex] !== undefined;

  return (
    <div
      className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in duration-500"
    >
      <div className="flex items-center justify-between mb-6 md:mb-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] md:text-xs hover:text-sky-500 transition group bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
        </button>
        <div className="flex items-center gap-2 glass-premium px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800 text-[10px] md:text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
          <span className="text-sky-500">{currentIndex + 1}</span> <span className="opacity-30">/</span> {questions.length} Questions
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-premium p-6 md:p-10 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-tight mb-8 relative z-10">
            {currentQuestion.question}
          </h2>

          <div className="grid gap-3 relative z-10">
            {currentQuestion.options.map((option: string, idx: number) => {
              const isSelected = answers[currentIndex] === idx;
              const isCorrect = idx === currentQuestion.correct_index;
              const statusClasses = isAnswered 
                ? isCorrect 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-400" 
                  : isSelected ? "bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-500 text-red-900 dark:text-red-400" : "bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60"
                : isSelected ? "bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-500/20" : "bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300";

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-5 rounded-2xl border-2 font-bold transition flex items-center justify-between gap-4 ${statusClasses}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                     <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border uppercase transition-colors shrink-0 ${isAnswered ? 'hidden' : isSelected ? 'bg-sky-400/20 border-sky-400 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {String.fromCharCode(65 + idx)}
                     </span>
                     <span className="leading-snug">{option}</span>
                  </div>
                  {isAnswered && (
                    isCorrect ? <CheckCircle2 size={24} className="text-green-500 shrink-0" /> : isSelected ? <XCircle size={24} className="text-red-500 shrink-0" /> : null
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isAnswered && (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <div className="glass-premium p-6 md:p-8 rounded-[2rem] border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 mb-6 group">
              <div className="flex items-start gap-4">
                <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-500 glow-sky shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-sky-600 dark:text-sky-400 mb-1.5 uppercase tracking-widest">Expert Explanation</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={nextQuestion}
              className="w-full bg-slate-900 dark:bg-sky-500 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 transition shadow-2xl shadow-sky-500/20 active:scale-95 group"
            >
              {currentIndex === questions.length - 1 ? "Finish Assessment" : "Next Question"}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
