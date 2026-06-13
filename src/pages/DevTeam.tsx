import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Instagram, MessageCircle, Globe, Heart, Rocket, Code, Sparkles, HeartHandshake, ExternalLink, QrCode, X, CheckCircle2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  zoom?: number;
  position?: string;
  isLeader?: boolean;
  social: {
    github?: string;
    twitter?: string;
    web?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

const TEAM: TeamMember[] = [
  {
    name: "Shireesh Kashyap",
    role: "Team Leader | Lead Architect & Visionary",
    isLeader: true,
    bio: "Architect of Genesis. Shireesh bridges the gap between impossible dreams and executable code, engineering the very foundation of the Nemesis ecosystem with relentless precision and futuristic vision.",
    avatar: "/shireesh.webp",
    zoom: 1.05,
    position: 'center 15%',
    social: { 
      github: "https://github.com/Sh123e5h", 
      instagram: "https://www.instagram.com/shiresh.kashyap/", 
      whatsapp: "https://wa.me/919450804495" 
    }
  },
  {
    name: "Shashwat Patel",
    role: "QA Lead & Stability Engineer",
    bio: "Guardian of the Nemesis architecture. Shashwat ensures every logic branch is battle-tested and every workflow is refined for a seamless, crash-free experience.",
    avatar: "/shashwat.webp",
    zoom: 1.1,
    position: 'center 20%',
    social: { 
      instagram: "https://www.instagram.com/shashwat.01__/", 
      whatsapp: "https://wa.me/917007817874" 
    }
  },
  {
    name: "Shivam Kumar",
    role: "Strategic Consultant & Advisor",
    bio: "The guiding voice of Nemesis. Shivam provides the strategic insights and innovative advice that refine our core direction and future-proof our evolution.",
    avatar: "/shivam.webp",
    zoom: 1.15,
    position: 'center 10%',
    social: { 
      instagram: "https://www.instagram.com/its_shivam_9890/",
      whatsapp: "https://wa.me/919305638947" 
    }
  }
];

const upiId = "shiresh.kashyap@oksbi";

/**
 * SupportModal - The Holographic Nexus Redesign
 * Mobile: solid backgrounds + fast tween. Desktop: full glassmorphism.
 */
import { createPortal } from 'react-dom';

// Detect mobile once — avoids re-render cost
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const SupportModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [isPaid, setIsPaid] = useState(false);
  const [copiedId, setCopiedId] = useState(false);


  const handleCopyId = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handlePayNow = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    const upiUrl = `upi://pay?pa=${upiId}&pn=Nemesis%20Dev&am=${selectedAmount}&cu=INR`;
    
    if (isMobile) {
      window.location.href = upiUrl;
      // On mobile, we don't set isPaid immediately so the user can see the QR/UPI details 
      // if the app fails to open or when they return.
    } else {
      handleCopyId();
      setIsPaid(true);
    }
  };

  // Only compute QR URL when modal is open — avoids network hit before user taps
  const qrCodeUrl = useMemo(() => {
    if (!isOpen) return '';
    const upiUrl = `upi://pay?pa=${upiId}&pn=Nemesis%20Dev&am=${selectedAmount}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}&margin=8&bgcolor=ffffff&color=0ea5e9`;
  }, [selectedAmount, isOpen]);

  const internalClose = () => {
    onClose();
    setTimeout(() => setIsPaid(false), 300);
  };

  // Portal to Body to escape any parent transforms/scroll issues
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 pointer-events-none">
          {/* Backdrop: on mobile solid dark overlay (no blur), on desktop frosted */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={internalClose}
            className={`absolute inset-0 pointer-events-auto ${
              isMobile
                ? 'bg-slate-950/80 backdrop-blur-sm'
                : 'bg-slate-400/10 backdrop-blur-[12px]'
            }`}
          />

             <motion.div
                initial={{ opacity: 0, y: isMobile ? 8 : 20, scale: isMobile ? 1 : 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: isMobile ? 8 : 20, scale: isMobile ? 1 : 0.95 }}
                transition={isMobile
                  ? { duration: 0.15, ease: 'linear' }
                  : { type: 'spring', damping: 25, stiffness: 300 }
                }
                className={`support-modal relative w-full max-w-4xl max-h-[min(98vh,800px)] rounded-[2rem] md:rounded-[3rem] border shadow-2xl z-10 overflow-hidden flex flex-col md:flex-row pointer-events-auto ${
                  isMobile
                    ? 'bg-white border-slate-200'
                    : 'bg-white/30 border-white/60 shadow-[0_64px_128px_-12px_rgba(0,0,0,0.15)] backdrop-blur-[40px]'
                }`}
             >
                {/* Left: Essential Context */}
                <div className="w-full md:w-[40%] relative overflow-hidden p-4 md:p-12 flex flex-row md:flex-col items-center justify-between text-center border-b md:border-b-0 md:border-r border-white/40 shrink-0">
                   {/* Background: full gradient on both mobile and desktop */}
                   <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-indigo-600 to-slate-900" />

                   <div className="relative space-y-1 md:space-y-4 z-10 text-left md:text-center">
                      {/* Mobile: no backdrop-blur on icon */}
                      <div className={`w-8 h-8 md:w-16 md:h-16 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center border border-white/30 shadow-xl lg:mx-auto ${
                        isMobile ? '' : 'backdrop-blur-xl animate-float'
                      }`}>
                         <HeartHandshake size={16} className="text-white md:w-8 md:h-8" />
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                         <h3 className="text-white font-black text-xs md:text-2xl uppercase tracking-[0.2em] drop-shadow-lg leading-tight">CORE <br className="md:hidden" /> UPLINK</h3>
                         <p className="text-[6px] md:text-[10px] text-sky-300 font-black uppercase tracking-[0.3em]">Nemesis Nexus</p>
                      </div>
                   </div>

                   {/* Mobile: no backdrop-blur, no hover scale, simpler container */}
                   <div className={`relative z-10 p-1 md:p-2 rounded-xl md:rounded-[2.5rem] border border-white/10 shadow-xl ${
                     isMobile ? 'bg-white/10' : 'bg-white/5 backdrop-blur-md animate-float [animation-delay:1s] group'
                   }`}>
                      <div className={`bg-white p-2 md:p-5 rounded-[0.8rem] md:rounded-[2rem] shadow-xl relative flex items-center justify-center ${
                        isMobile ? '' : 'transition duration-500 group-hover:scale-[1.05] group-hover:rotate-1'
                      }`}>
                         {qrCodeUrl && (
                           <img
                             src={qrCodeUrl}
                             alt="UPI QR Code for Nemesis Development Support"
                             width={isMobile ? 65 : 160}
                             height={isMobile ? 65 : 160}
                             className="object-contain"
                             loading="lazy"
                           />
                         )}
                      </div>
                   </div>

                    <div className="hidden md:flex relative w-full px-5 py-2.5 bg-white/5 rounded-xl border border-white/10 items-center gap-4 z-10 overflow-hidden group/star">
                    <div className="flex items-center gap-2 shrink-0 relative z-20 bg-inherit pr-2">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                       <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                    </div>
                    
                    <div className="flex-1 whitespace-nowrap overflow-hidden relative z-10">
                       <div className="flex gap-8 animate-marquee group-hover/star:[animation-play-state:paused]">
                          <span className="text-[8px] text-sky-50/70 font-bold uppercase tracking-[0.4em]">Nexus_Link_04_Established</span>
                          <span className="text-[8px] text-sky-50/40 font-bold uppercase tracking-[0.4em]">//</span>
                          <span className="text-[8px] text-sky-50/70 font-bold uppercase tracking-[0.4em]">Latency_0.02ms</span>
                          <span className="text-[8px] text-sky-50/40 font-bold uppercase tracking-[0.4em]">//</span>
                          <span className="text-[8px] text-sky-50/80 font-bold uppercase tracking-[0.4em]">Stable_Auth_Confirmed</span>
                          <span className="text-[8px] text-sky-50/40 font-bold uppercase tracking-[0.4em]">//</span>
                          {/* Duplicate for seamless loop */}
                          <span className="text-[8px] text-sky-50/70 font-bold uppercase tracking-[0.4em]">Nexus_Link_04_Established</span>
                          <span className="text-[8px] text-sky-50/40 font-bold uppercase tracking-[0.4em]">//</span>
                          <span className="text-[8px] text-sky-50/70 font-bold uppercase tracking-[0.4em]">Latency_0.02ms</span>
                       </div>
                    </div>
                 </div>
             </div>

             {/* Right: Interaction Core */}
             <div className="flex-1 p-6 md:p-14 flex flex-col justify-between items-stretch relative overflow-y-auto md:overflow-visible">
                <button onClick={internalClose} className="absolute top-4 md:top-8 right-4 md:right-8 p-2.5 md:p-3 bg-white/30 md:bg-white/30 hover:bg-white/50 rounded-full text-slate-500 hover:text-slate-900 transition z-[60]"><X size={18} className="md:w-[20px] md:h-[20px]" /></button>

                <AnimatePresence mode="wait">
                  {!isPaid ? (
                    <motion.div key="config" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col justify-center py-2 md:py-0">
                       <div className="space-y-6 md:space-y-10">
                          <div className="space-y-3 md:space-y-4">
                             <div className="flex items-center justify-between px-1">
                                <label className="text-[9px] md:text-[10px] font-black text-slate-900/60 uppercase tracking-[0.4em]">Contribution Level</label>
                             </div>
                             <div className="grid grid-cols-3 gap-2 md:gap-3">
                                {[100, 500, 1000].map((amount) => (
                                  <button key={amount} onClick={() => setSelectedAmount(amount)} className={`relative py-2.5 md:py-5 rounded-xl md:rounded-2xl font-black transition border-2 overflow-hidden shadow-sm ${selectedAmount === amount ? 'bg-sky-500 border-sky-400 text-white shadow-sky-500/30' : 'bg-white/40 border-white/60 text-slate-700 hover:bg-white/60'}`}>
                                     {selectedAmount === amount && <motion.div layoutId="amt-glitter" className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />}
                                     <span className="relative z-10 text-xs md:text-base">₹{amount}</span>
                                  </button>
                                ))}
                             </div>
                          </div>

                           {/* Amount display: on mobile no backdrop-blur */}
                           <div className={`p-4 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border border-white/30 relative overflow-hidden ${
                             isMobile ? 'bg-slate-50' : 'bg-white/20 backdrop-blur-2xl group'
                           }`}>
                              {!isMobile && <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity text-slate-900"><QrCode size={100} className="md:w-[130px] md:h-[130px]" /></div>}
                              <div className="flex items-baseline gap-2 md:gap-4 relative z-10 justify-center md:justify-start">
                                 <span className="text-4xl md:text-8xl font-black text-slate-900 tracking-tighter">₹{selectedAmount}</span>
                                 <span className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-[0.4em]">INR</span>
                              </div>
                           </div>
                       </div>

                       <div className="mt-4 md:mt-12 space-y-3 md:space-y-5">
                          <button onClick={handlePayNow} className="group relative w-full h-14 md:h-22 bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600 rounded-2xl md:rounded-[1.8rem] text-white font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-[10px] md:text-[11px] shadow-[0_20px_40px_-10px_rgba(14,165,233,0.5)] hover:shadow-[0_25px_50px_-12px_rgba(14,165,233,0.7)] hover:-translate-y-1 active:translate-y-0 transition overflow-hidden flex items-center justify-center gap-3 md:gap-4">
                             <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer pointer-events-none" />
                             <Rocket size={16} className="md:w-[22px] md:h-[22px] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                             <span className="relative z-10">DONE</span>
                          </button>
                          
                           {/* UPI ID: no backdrop-blur on mobile */}
                           <div className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border ${
                             isMobile ? 'bg-slate-100 border-slate-200' : 'bg-white/20 border-white/30 backdrop-blur-lg'
                           }`}>
                              <div className="flex-1 truncate px-1">
                                 <p className="text-[7px] md:text-[8px] font-black text-slate-700 uppercase tracking-widest">Global UPI ID</p>
                                 <p className="text-[10px] md:text-xs font-bold text-slate-900 truncate">{upiId}</p>
                              </div>
                              <button onClick={handleCopyId} className={`px-4 md:px-5 py-2 rounded-lg font-black text-[8px] md:text-[9px] uppercase tracking-widest transition-colors ${copiedId ? 'bg-emerald-500 text-white' : 'bg-white/40 text-slate-800'}`}>
                                {copiedId ? 'SUCCESS' : 'COPY'}
                              </button>
                           </div>
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center space-y-10 py-10">
                       <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 border border-white/40 shadow-xl backdrop-blur-xl">
                          <CheckCircle2 size={48} strokeWidth={2.5} />
                       </div>
                       <div className="space-y-3">
                          <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">THANK YOU</h4>
                          <p className="text-xs text-slate-700 font-bold uppercase tracking-[0.2em] max-w-xs leading-relaxed">Your contribution has been recorded. We appreciate your support in building the future of Nemesis.</p>
                       </div>
                       <button onClick={() => { setIsPaid(false); onClose(); }} className="px-14 py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition">CLOSE PORTAL</button>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default function DevTeam() {
  const navigate = useNavigate();
  const [showSupportModal, setShowSupportModal] = useState(false);

  useLayoutEffect(() => {
    const originalScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    
    window.scrollTo(0, 0);
    
    document.documentElement.scrollTo(0, 0);
    
    return () => {
      window.history.scrollRestoration = originalScrollRestoration;
    };
  }, []);

  useEffect(() => {
    if (showSupportModal) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [showSupportModal]);

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 20 } }
  };

  return (
    <div 
      className="dev-team-page min-h-screen bg-slate-50 selection:bg-sky-500 selection:text-white"
    >
      <SEO 
        title="Meet the Architects | Nemesis Dev Team" 
        description="Meet the visionary team behind the Nemesis core and the architects of the next-generation academic ecosystem."
      />
      <div className="max-w-5xl mx-auto p-3 md:p-12 pb-6 md:pb-12 space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
            <button 
              onClick={() => navigate(-1)} 
              className="group/back flex items-center gap-2.5 px-4 py-2 bg-white/40 hover:bg-white/80 border border-white/60 hover:border-sky-200 backdrop-blur-md rounded-full text-slate-500 hover:text-sky-600 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition shadow-sm hover:shadow-sky-500/10 hover:-translate-y-0.5 active:translate-y-0"
            >
              <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" /> 
              Return to Reality
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-200 rounded-full text-sky-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Sparkles size={12} className="animate-pulse" /> Meet Team Genesis
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase leading-none md:leading-[0.9]">The <span className="text-sky-500">Architects</span> <br /> Behind <span className="text-slate-400">Nemesis</span></h1>
            <p className="max-w-lg text-slate-500 font-medium text-sm md:text-lg leading-relaxed">We are a small group of thinkers, builders, and dreamers dedicated to building a smarter, unified future for learners worldwide.</p>
            <div className="max-w-lg text-left mt-2 border-l-4 border-sky-500 pl-4 py-1">
              <p className="text-slate-600 dark:text-slate-400 italic text-sm md:text-base font-bold">"We just don't mould success stories, we make legacy, as we outperform."</p>
            </div>
          </div>
          <div className="hidden lg:block"><div className="w-32 h-32 bg-sky-100 rounded-[2.5rem] flex items-center justify-center text-sky-600 shadow-2xl rotate-6 animate-pulse"><Sparkles size={64} strokeWidth={1} /></div></div>
        </div>

        <motion.div variants={containerVars} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TEAM.map((dev) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const mouseX = useMotionValue(0);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const mouseY = useMotionValue(0);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

            return (
              <motion.div key={dev.name} variants={itemVars} onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
                mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
              }} onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="dev-card group bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-sky-500/10 transition duration-500 relative overflow-hidden">
                <motion.div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-transparent to-indigo-500/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700" style={{ x: mouseX, y: mouseY }} />
                <div className="relative z-10 space-y-4 md:space-y-6" style={{ transform: "translateZ(50px)" }}>
                    <div className="relative inline-block mb-1 group-hover:-translate-y-2 transition-transform duration-500">
                      <div className="dev-avatar-frame w-32 h-32 md:w-44 md:h-44 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border-4 border-slate-50 group-hover:border-white relative">
                        <img src={dev.avatar} alt={`${dev.name} - Nemesis ${dev.role}`} className="w-full h-full object-cover transition duration-500" style={{ objectPosition: (dev as any).position || 'center', transform: `scale(${(dev as any).zoom || 1.35})` }} />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 md:w-10 md:h-10 bg-slate-950 rounded-lg md:rounded-xl flex items-center justify-center text-white scale-0 group-hover:scale-110 transition-transform duration-300 delay-100 shadow-lg ring-2 md:ring-4 ring-white z-20"><Code size={14} className="md:w-[18px] md:h-[18px]" /></div>
                    </div>
                    <div className="space-y-0.5 md:space-y-1">
                      {dev.isLeader && (
                         <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-sky-500 to-sky-600 rounded-lg text-[10px] font-black text-white uppercase tracking-[0.25em] mb-2 group-hover:scale-110 transition-transform shadow-xl shadow-sky-500/30 overflow-hidden ring-0 outline-none">
                            <Sparkles size={12} className="fill-white/30 animate-pulse" /> Genesis Lead
                         </div>
                      )}
                      <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{dev.name}</h3>
                      <p className="text-[10px] md:text-xs font-black text-sky-600 uppercase tracking-[0.12em] md:tracking-[0.15em]">{dev.role}</p>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed italic line-clamp-3 md:line-clamp-none">"{dev.bio}"</p>
                    <div className="pt-2 md:pt-4 flex items-center gap-3 md:gap-4">
                      {dev.social.github && (
                        <a href={dev.social.github} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-950 transition-colors">
                          <Github size={16} className="md:w-[18px] md:h-[18px]" />
                        </a>
                      )}
                      {(dev.social as any).instagram && (
                        <a href={(dev.social as any).instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">
                          <Instagram size={16} className="md:w-[18px] md:h-[18px]" />
                        </a>
                      )}
                      {(dev.social as any).whatsapp && (
                        <a href={(dev.social as any).whatsapp} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-500 transition-colors">
                          <MessageCircle size={16} className="md:w-[18px] md:h-[18px]" />
                        </a>
                      )}
                      {(dev.social as any).twitter && (
                        <a href={(dev.social as any).twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors">
                          <Globe size={16} className="md:w-[18px] md:h-[18px]" />
                        </a>
                      )}
                      <div className="w-[1px] h-3 md:h-4 bg-slate-200 ml-auto" />
                      {dev.name === "Shireesh Kashyap" && (
                        <button onClick={() => setShowSupportModal(true)} className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-rose-50 text-rose-500 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition duration-300 group/support relative overflow-hidden shadow-sm">
                          <Heart size={12} className="group-hover/support:fill-white transition-colors md:w-[14px] md:h-[14px]" /> Support
                        </button>
                      )}
                    </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mission-section bg-sky-500 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-16 text-center space-y-6 md:space-y-8 relative overflow-hidden group/mission shadow-2xl shadow-sky-200">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-600 to-indigo-600 opacity-90 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl"><HeartHandshake size={10} className="text-white fill-white/20" /> Help us build the future</div>
            <h2 className="text-2xl md:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto uppercase">Support the Mission <br /> Powered by Team Genesis</h2>
            <p className="max-w-lg mx-auto text-sky-100 font-medium text-sm md:text-lg leading-relaxed opacity-90">Your support directly funds server costs, security audits, and new features. Every contribution helps us maintain our independence.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 pt-4 md:pt-10">
              <motion.button onClick={() => setShowSupportModal(true)} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3 px-6 md:px-10 py-4 md:py-5 bg-white/10 backdrop-blur-2xl text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-2xl border border-white/20 hover:bg-white/20 hover:border-emerald-400 group/upi overflow-hidden relative transition duration-300 min-w-0 w-full md:w-auto md:min-w-[320px]">
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" initial={{ x: '-200%', skewX: -20 }} animate={{ x: '200%' }} transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }} />
                <span className="relative z-10 flex items-center justify-center gap-3 font-black w-full"><QrCode size={20} className="text-emerald-400 group-hover/upi:rotate-12 transition-transform" /> Support via UPI</span>
              </motion.button>
              <a href="https://github.com/Sh123e5h/Nemesis" target="_blank" rel="noopener noreferrer" className="contents">
                <motion.button whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-3 px-6 md:px-10 py-4 md:py-5 bg-white/5 backdrop-blur-2xl text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-2xl border border-white/10 hover:bg-white/15 hover:border-indigo-400 group/gh relative overflow-hidden transition duration-300 min-w-0 w-full md:w-auto md:min-w-[280px]">
                  <span className="relative z-10 flex items-center justify-center gap-3 w-full"><Github size={20} className="group-hover/gh:scale-110 transition-transform" /> Source Code <ExternalLink size={16} className="opacity-40 group-hover/gh:opacity-100 group-hover/gh:translate-x-1 transition" /></span>
                </motion.button>
              </a>
            </div>
          </div>
          
          {/* Bottom System Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-10 md:h-14 bg-white/5 border-t border-white/10 backdrop-blur-md flex items-center px-4 md:px-12 overflow-hidden z-20 group/stat">
             <div className="flex items-center gap-2 shrink-0 pr-4 md:pr-6 border-r border-white/10 relative z-10 bg-inherit/10">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest opacity-80">Mission Node: Active</span>
             </div>
             
             <div className="flex-1 whitespace-nowrap overflow-hidden relative z-0">
                <div className="flex gap-12 animate-marquee group-hover/stat:[animation-play-state:paused]">
                   <span className="text-[8px] md:text-[10px] text-white/70 font-bold uppercase tracking-[0.4em]">Server_Uptime: 99.99%</span>
                   <span className="text-[8px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">//</span>
                   <span className="text-[8px] md:text-[10px] text-white/70 font-bold uppercase tracking-[0.4em]">Nodes_Online: 1,284</span>
                   <span className="text-[8px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">//</span>
                   <span className="text-[8px] md:text-[10px] text-white/80 font-bold uppercase tracking-[0.4em]">Security: Alpha_Secured</span>
                   <span className="text-[8px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">//</span>
                   <span className="text-[8px] md:text-[10px] text-white/70 font-bold uppercase tracking-[0.4em]">Server_Uptime: 99.99%</span>
                </div>
             </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-16 text-center space-y-6 md:space-y-8 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md"><Rocket size={10} className="text-sky-400" /> Building for the future</div>
          <h2 className="text-xl md:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto uppercase flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
            <span>Built with</span> <motion.div whileHover={{ scale: 1.2 }}><Heart size={32} className="md:w-[44px] md:h-[44px] text-red-500 animate-pulse fill-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></motion.div> <span>by developers who care.</span>
          </h2>
          <div className="flex flex-nowrap md:flex-wrap items-center justify-center gap-2 md:gap-6 pt-2 md:pt-4">
            <div className="whitespace-nowrap flex items-center gap-1.5 md:gap-2 text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/5 py-1.5 px-2.5 md:py-2 md:px-4 rounded-lg md:rounded-xl"><Code size={12} className="text-sky-400 md:w-[14px] md:h-[14px] shrink-0" /> <span className="truncate">1M+ Lines of Code</span></div>
            <div className="whitespace-nowrap flex items-center gap-1.5 md:gap-2 text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/5 py-1.5 px-2.5 md:py-2 md:px-4 rounded-lg md:rounded-xl"><Sparkles size={12} className="text-amber-400 md:w-[14px] md:h-[14px] shrink-0" /> <span className="truncate">Genius AI Powered</span></div>
          </div>
        </motion.div>
        <footer className="text-center mt-8 md:mt-16 pb-4">
          <p className="text-[10px] md:text-xs font-medium text-slate-500 text-center opacity-100 tracking-normal">
            Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
          </p>
        </footer>
      </div>


      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
}
