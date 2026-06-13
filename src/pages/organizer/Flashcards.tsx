import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useMobile } from '../../hooks/useMobile';
import { 
  Plus, 
  Search, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  MoreVertical,
  Layers,
  Users,
  LayoutGrid,
  List,
  Sparkles,
  X,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  subject: string;
  card_count: number;
  due_count: number;
  group_id?: string;
  created_at: string;
}

interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  created_at: string;
}

export default function Flashcards() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeck, setNewDeck] = useState({ title: '', description: '', subject: '' });
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [deckCards, setDeckCards] = useState<Flashcard[]>([]);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const { isMobile } = useMobile();

  const fetchDecks = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const query = supabase
        .from('flashcard_decks')
        .select(`
          *,
          flashcards(count)
        `)
        .eq('group_id', groupId);

      const { data, error } = await query;

      if (error) throw error;

      const processedDecks: FlashcardDeck[] = (data || []).map(d => ({
        ...d,
        card_count: (d.flashcards as any)?.[0]?.count || 0,
        due_count: Math.floor(Math.random() * 5) // Mock due count
      }));

      setDecks(processedDecks);
    } catch (err) {
      console.error('Error fetching decks:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const fetchDeckCards = useCallback(async (deckId: string) => {
    const { data } = await supabase.from('flashcards').select('*').eq('deck_id', deckId).order('created_at', { ascending: false });
    setDeckCards(data || []);
  }, []);

  useEffect(() => {
    if (!groupId) {
      navigate('/organizer', { replace: true });
    }
  }, [groupId, navigate]);

  useEffect(() => {
    if (groupId) fetchDecks();
  }, [groupId, fetchDecks]);

  useEffect(() => {
    if (selectedDeck) {
      fetchDeckCards(selectedDeck.id);
    }
  }, [selectedDeck, fetchDeckCards]);

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeck || !newCard.front.trim() || !newCard.back.trim()) return;

    try {
      const { data, error } = await supabase
        .from('flashcards')
        .insert([{ ...newCard, deck_id: selectedDeck.id }])
        .select()
        .single();

      if (error) throw error;
      setDeckCards([data, ...deckCards]);
      setNewCard({ front: '', back: '' });
      fetchDecks(); // Refresh card counts
    } catch (err) {
      console.error('Error adding card:', err);
    }
  };

  const deleteDeck = async (id: string) => {
     if (!confirm('Are you sure you want to delete this deck?')) return;
     try {
       await supabase.from('flashcard_decks').delete().eq('id', id);
       setDecks(decks.filter(d => d.id !== id));
     } catch (err) { console.error(err); }
  };

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeck.title.trim() || !groupId) return;

    try {
      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert([{
          ...newDeck,
          user_id: user?.id,
          group_id: groupId
        }])
        .select()
        .single();

      if (error) throw error;
      setDecks([data, ...decks]);
      setShowCreateModal(false);
      setNewDeck({ title: '', description: '', subject: '' });
    } catch (err) {
      console.error('Error creating deck:', err);
    }
  };

  const filteredDecks = decks.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!groupId) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-6 md:pb-8 animate-in fade-in duration-500 mobile-hardened">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white-cyberpunk:text-emerald-400 flex items-center gap-4 uppercase tracking-tight">
            <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-500 glow-sky">
              <Layers size={32} />
            </div>
            Flash Decks
          </h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-widest text-[10px] md:text-xs">Master your subjects with high-density spaced repetition.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-72 group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none">
              <Search size={18} />
            </div>
            <input 
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-premium bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition"
            />
          </div>
          <div className="flex glass-premium bg-slate-100/50 dark:bg-slate-800/30 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition shadow-lg shadow-sky-500/20 active:scale-95 shrink-0"
          >
            <Plus size={18} /> New Deck
          </button>
        </div>
      </div>

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 md:mb-12">
        <div className="glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/40 border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 p-5 rounded-[2rem] flex items-center gap-5 group hover:border-sky-500/30 transition-all duration-300">
          <div className="w-14 h-14 bg-sky-500/10 rounded-2xl flex items-center justify-center text-sky-500 glow-sky group-hover:scale-110 transition-transform">
             <BookOpen size={28} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight">{decks.length}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] font-black">Total Decks</div>
          </div>
        </div>
        <div className="glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/40 border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 p-5 rounded-[2rem] flex items-center gap-5 group hover:border-amber-500/30 transition-all duration-300">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 glow-orange group-hover:scale-110 transition-transform">
             <Clock size={28} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-500 uppercase tracking-tight">{decks.reduce((acc, d) => acc + (d.due_count || 0), 0)}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] font-black">Cards Due</div>
          </div>
        </div>
        <div className="glass-premium dark:bg-slate-900/40 cyberpunk:bg-black/40 border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 p-5 rounded-[2rem] flex items-center gap-5 group hover:border-emerald-500/30 transition-all duration-300">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 glow-emerald group-hover:scale-110 transition-transform">
             <CheckCircle size={28} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight">{decks.reduce((acc, d) => acc + (d.card_count || 0), 0)}</div>
            <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] font-black">Total Cards</div>
          </div>
        </div>
      </div>

      {/* Deck Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
             <div key={i} className="h-48 glass-premium dark:bg-slate-800/20 animate-pulse rounded-2xl border border-slate-200/50 dark:border-slate-800" />
          ))}
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-24 glass-premium dark:bg-slate-800/10 rounded-[3rem] border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/20 border-dashed flex flex-col items-center justify-center">
           <div className="w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mb-6">
             <Layers size={40} className="text-slate-300 dark:text-slate-700" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 dark:text-white-cyberpunk:text-emerald-400 uppercase tracking-tight">No Decks Found</h3>
           <p className="text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Create your first flashcard deck to start studying!</p>
           <button 
             onClick={() => setShowCreateModal(true)}
             className="mt-8 bg-sky-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition shadow-lg shadow-sky-500/20 active:scale-95"
           >
             Add New Deck
           </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDecks.map((deck) => (
              <motion.div
                key={deck.id}
                layout={!isMobile}
                initial={isMobile ? undefined : { opacity: 0, scale: 0.9 }}
                animate={isMobile ? undefined : { opacity: 1, scale: 1 }}
                exit={isMobile ? undefined : { opacity: 0, scale: 0.9 }}
                className="group relative glass-premium bg-white/40 dark:bg-slate-900/40 cyberpunk:bg-black/40 hover:bg-white/60 dark:hover:bg-slate-900/60 transition duration-500 border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 rounded-[2.5rem] overflow-hidden shadow-xl md:hover:-translate-y-2 md:hover:shadow-sky-500/10"
              >
                <div className="p-7">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-sky-500/10 text-sky-500 rounded-2xl group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 glow-sky">
                      <Layers size={24} />
                    </div>
                      <button 
                        onClick={() => deleteDeck(deck.id)}
                        className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </div>
                    <div className="relative mb-3">
                      <Sparkles className="absolute -top-1 -right-4 text-sky-500 w-4 h-4 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors uppercase tracking-tight">{deck.title}</h3>
                    </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black rounded-lg border border-slate-200/50 dark:border-slate-700/50">{deck.subject || 'General'}</span>
                    {deck.group_id && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500/10 text-sky-500 text-[9px] uppercase font-black rounded-lg border border-sky-500/20"><Users size={10} /> Shared</span>}
                  </div>
                  
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-8 min-h-[3rem] font-medium leading-relaxed">{deck.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-4">
                      <div className="text-center group/stat">
                        <div className="text-xl font-black text-slate-900 dark:text-white transition-colors group-hover/stat:text-sky-500">{deck.card_count}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-widest">Total</div>
                      </div>
                      <div className="text-center group/stat">
                        <div className="text-xl font-black text-amber-500 transition-colors group-hover/stat:text-amber-400">{deck.due_count}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-widest">Due</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedDeck(deck); setShowCardsModal(true); }}
                        className="w-10 h-10 flex items-center justify-center glass-premium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-white hover:border-sky-500/50 rounded-xl transition-all duration-300 active:scale-90"
                        title="Manage Cards"
                      >
                        <Plus size={20} />
                      </button>
                      <button 
                        onClick={() => navigate(`/groups/${groupId}/flashcards/study/${deck.id}`)}
                        className="group/btn flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all duration-300 active:scale-95 shadow-lg shadow-sky-500/20"
                      >
                        Study <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-4">
           {filteredDecks.map((deck) => (
             <div key={deck.id} className="flex items-center justify-between p-5 glass-premium bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 rounded-2xl transition-all duration-300 group">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl group-hover:bg-sky-500 group-hover:text-white transition-all duration-300 glow-sky">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{deck.title}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{deck.subject} • {deck.card_count} cards</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">{deck.due_count} due</span>
                  <button 
                     onClick={() => { setSelectedDeck(deck); setShowCardsModal(true); }}
                     className="p-2.5 glass-premium bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-sky-500 rounded-xl transition-all"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                     onClick={() => navigate(`/groups/${groupId}/flashcards/study/${deck.id}`)}
                     className="p-2.5 bg-sky-500 text-white rounded-xl transition-all hover:bg-sky-600 shadow-lg shadow-sky-500/20 active:scale-90"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Manage Cards Modal */}
      <AnimatePresence>
        {showCardsModal && selectedDeck && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-10 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white dark:bg-slate-900 cyberpunk:bg-black border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 rounded-[3rem] w-full max-w-5xl max-h-full md:max-h-[85vh] shadow-2xl overflow-hidden flex flex-col transition-colors"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-5">
                  <div className="bg-sky-500/10 p-3 rounded-2xl text-sky-500 glow-sky">
                    <Layers size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white-cyberpunk:text-emerald-400 leading-tight uppercase tracking-tight">{selectedDeck.title}</h2>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                       Manage Cards <span className="w-1.5 h-1.5 bg-sky-500/40 rounded-full" /> {deckCards.length} Total
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowCardsModal(false); setSelectedDeck(null); }} 
                  className="w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-96 p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 space-y-8 bg-slate-50/20 dark:bg-slate-950/10">
                  <h3 className="font-black text-sky-500 dark:text-sky-400 flex items-center gap-3 uppercase tracking-widest text-xs">
                    <Plus size={18} /> New Flashcard
                  </h3>
                  <form onSubmit={addCard} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Front (Question)</label>
                      <textarea 
                        required
                        value={newCard.front}
                        onChange={(e) => setNewCard({...newCard, front: e.target.value})}
                        placeholder="e.g. What is Active Recall?"
                        className="w-full bg-slate-100/50 dark:bg-slate-800/40 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl p-4 text-sm font-medium text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 resize-none h-32 shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Back (Answer)</label>
                      <textarea 
                        required
                        value={newCard.back}
                        onChange={(e) => setNewCard({...newCard, back: e.target.value})}
                        placeholder="e.g. A method of efficient learning..."
                        className="w-full bg-slate-100/50 dark:bg-slate-800/40 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl p-4 text-sm font-medium text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 resize-none h-32 shadow-inner"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!newCard.front.trim() || !newCard.back.trim()}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
                    >
                      Add Flashcard
                    </button>
                  </form>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
                   <h3 className="font-black text-slate-400 dark:text-slate-600 mb-6 flex items-center gap-3 uppercase text-[10px] tracking-[0.2em] relative">
                     <Layers size={14} className="text-sky-500/40" /> Card Inventory
                     <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-sky-500/20 rounded-full" />
                   </h3>
                   <div className="space-y-4">
                     {deckCards.length === 0 ? (
                       <div className="text-center py-20 flex flex-col items-center justify-center gap-4">
                          <Brain size={48} className="text-slate-200 dark:text-slate-800 animate-pulse" />
                          <div>
                            <p className="text-slate-900 dark:text-white font-black uppercase tracking-tight">Empty Inventory</p>
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Start adding cards to build your memory palace</p>
                          </div>
                       </div>
                     ) : (
                       deckCards.map((card) => (
                         <div key={card.id} className="p-5 glass-premium bg-white/40 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex items-start justify-between group hover:border-sky-500/30 transition-all duration-300">
                            <div className="space-y-3 flex-1 pr-6">
                               <div className="text-sm font-black text-slate-900 dark:text-white leading-snug">{card.front}</div>
                               <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/30 dark:border-slate-700/50 leading-relaxed">{card.back}</div>
                            </div>
                            <button 
                               onClick={async () => {
                                 if(!confirm('Delete this card?')) return;
                                 await supabase.from('flashcards').delete().eq('id', card.id);
                                 setDeckCards(deckCards.filter(c => c.id !== card.id));
                                 fetchDecks();
                               }}
                               className="w-8 h-8 flex items-center justify-center glass-premium bg-red-50 dark:bg-red-900/10 text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all active:scale-90"
                            >
                              <X size={16} />
                            </button>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* Create Deck Modal */}
      <AnimatePresence>
        {showCreateModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white dark:bg-slate-900 cyberpunk:bg-black border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-500 glow-sky">
                    <Layers size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">New Flash Deck</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-900 transition-all duration-300">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={createDeck} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Deck Title</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    value={newDeck.title}
                    onChange={(e) => setNewDeck({...newDeck, title: e.target.value})}
                    placeholder="e.g. Organic Chemistry Final"
                    className="w-full bg-slate-50 dark:bg-slate-800/40 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Subject</label>
                  <input 
                    type="text"
                    value={newDeck.subject}
                    onChange={(e) => setNewDeck({...newDeck, subject: e.target.value})}
                    placeholder="e.g. Science"
                    className="w-full bg-slate-50 dark:bg-slate-800/40 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Description (Optional)</label>
                  <textarea 
                    value={newDeck.description}
                    onChange={(e) => setNewDeck({...newDeck, description: e.target.value})}
                    placeholder="Notes about this deck..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newDeck.title.trim()}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition shadow-2xl shadow-sky-500/20 active:scale-95 disabled:opacity-50 mt-4"
                >
                  Create Deck
                </button>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
