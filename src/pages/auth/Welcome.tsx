import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import SEO from '../../components/SEO';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?ixlib=rb-4.0.3&auto=format&fit=crop&q=80&w=1200',
    title: 'Total Academic Productivity',
    desc: 'Nemesis is a comprehensive collaborative platform designed for students to organize studies, collaborate in groups, and manage their entire academic journey in one high-performance hub.',
    highlight: 'The All-in-One Studio'
  },
  {
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&q=80',
    title: 'Organize Your Studies',
    desc: 'Keep all your subjects, topics, and files in a clean, elegant 3-level hierarchy.',
    highlight: 'Master your materials'
  },
  {
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&q=80',
    title: 'Study Together',
    desc: 'Create invite-only group spaces to share notes, exchange files, and collaborate seamlessly.',
    highlight: 'Connect with peers'
  },
  {
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&q=80',
    title: 'Stay on Track',
    desc: 'Use the powerful planner to track your tasks, team polls, and real-time coordination.',
    highlight: 'Never miss a deadline'
  },
  {
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?ixlib=rb-4.0.3&auto=format&fit=crop&q=80',
    title: 'Chat & Collaborate',
    desc: 'Engage in dedicated group chats to discuss ideas, share rapid feedback, and solve complex problems in real-time.',
    highlight: 'Real-time discussions'
  },
  {
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&q=80',
    title: 'Make It Yours',
    desc: 'Customize your Nemesis experience with dynamic, gorgeous themes like Dark Mode, Glassmorphism, and Cyberpunk.',
    highlight: 'Deep Personalization'
  }
];

export default function Welcome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number|null>(null);
  const [touchEnd, setTouchEnd] = useState<number|null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    SLIDES.forEach(slide => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  const handleFinish = async () => {
    try {
      const { profile, refreshProfile } = useAuthStore.getState();
      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', profile.id);
        
        if (error) throw error;
        await refreshProfile();
      }
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      navigate('/home', { replace: true });
    }
  };

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsTransitioning(false);
      }, 300);
    } else {
      handleFinish();
    }
  };

  const goToSlide = (index: number) => {
    if (index === currentSlide || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 300);
  };

  const prevSlide = () => {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && currentSlide < SLIDES.length - 1) nextSlide();
    else if (distance < -50) prevSlide();
  };

  const slide = SLIDES[currentSlide];
  const isExplicitWelcome = window.location.pathname === '/onboarding';

  return (
    <main className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center p-4 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1rem)] md:pt-4 md:pb-4 overflow-hidden relative">
      {isExplicitWelcome ? (
        <SEO 
          title="Welcome to Nemesis" 
          description="Embark on your academic journey with the primary Nemesis onboarding experience. Discover our core mission and unified features."
        />
      ) : (
        <SEO 
          title="Nemesis | Academic Platform"
          description="Nemesis is a unified academic ecosystem where students sync materials, collaborate in real-time groups, and optimize their study workflow with precision tools."
        />
      )}
      
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10 scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${slide.image}&w=32)`, filter: 'blur(40px)' }}
      />

      <div 
        className="relative w-full max-w-md flex flex-col z-20 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-between items-center mb-8 px-2 w-full relative z-30">
          <div className="text-slate-900 font-black tracking-widest text-xl flex items-center gap-2">
            <img src="/logo.svg" alt="Nemesis Logo" className="w-8 h-8" />
            <h1 className="text-xl font-black m-0">NEMESIS</h1>
          </div>
          <button onClick={handleFinish} className="text-slate-500 font-bold hover:text-slate-900 transition text-sm flex items-center gap-1 group relative z-30 cursor-pointer">
            Skip <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className={`relative bg-white/40 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-sky-200/20 transition duration-300 transform z-20 ${isTransitioning ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
          <div className="h-64 sm:h-72 w-full relative overflow-hidden group">
            <img 
              src={`${slide.image}&w=1200`} 
              srcSet={`${slide.image}&w=600 600w, ${slide.image}&w=1200 1200w`}
              sizes="(max-width: 640px) 600px, 1200px"
              alt={slide.title}
              width={1200}
              height={800}
              fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
              loading={currentSlide === 0 ? 'eager' : 'lazy'}
              decoding={currentSlide === 0 ? 'sync' : 'async'}
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 py-1 px-3 bg-white/60 text-sky-600 border border-white/80 rounded-full text-[10px] font-black backdrop-blur-md uppercase tracking-[0.15em] shadow-sm pointer-events-none">
              {slide.highlight}
            </div>
          </div>
          <div className="p-8 pb-12 text-center relative">
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight" data-snippet>{slide.title}</h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium" data-snippet>{slide.desc}</p>
          </div>
        </div>

        <div className="mt-10 space-y-10 px-2 relative z-30 pointer-events-auto">
          <div className="flex justify-center">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/30 backdrop-blur-md border border-white/40 rounded-full shadow-sm shadow-sky-100/10">
              {SLIDES.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="p-3 -mx-2 -my-2 group cursor-pointer flex items-center justify-center"
                >
                  <div className={`h-1.5 rounded-full transition duration-500 group-hover:bg-sky-400
                    ${i === currentSlide ? 'w-10 bg-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.6)]' : 'w-2 bg-slate-400/60'}`} />
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={nextSlide}
            className="w-full bg-white border border-white shadow-2xl shadow-sky-200/50 text-slate-900 font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-50 hover:text-sky-600 transition active:scale-95 group text-lg relative z-30 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
            {currentSlide === SLIDES.length - 1 ? 'Get Started' : 'Continue'} 
            <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-8 pb-4 flex flex-col items-center gap-4 animate-in fade-in duration-1000 delay-500">
          <p className="text-[10px] font-medium text-slate-500 tracking-normal">Built with ❤️ by Team Genesis</p>
        </div>
      </div>
    </main>
  );
}
