import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  setHours, 
  setMinutes, 
  parseISO,
  isValid,
  isToday
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface CustomDateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export default function CustomDateTimePicker({ 
  value, 
  onChange, 
  label = "DUE DATE",
  placeholder = "Select date and time..."
}: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 380); // Open upward if less than 380px below
    }
  }, [isOpen]);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }, [value]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      setViewDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    const newDate = selectedDate ? 
      setHours(setMinutes(date, selectedDate.getMinutes()), selectedDate.getHours()) : 
      date;
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'ampm', increment: boolean) => {
    const current = selectedDate || new Date();
    let h = current.getHours();
    let m = current.getMinutes();

    if (type === 'hour') {
      h = increment ? (h + 1) % 24 : (h - 1 + 24) % 24;
    } else if (type === 'minute') {
      m = increment ? (m + 1) % 60 : (m - 1 + 60) % 60;
    } else if (type === 'ampm') {
      h = (h + 12) % 24;
    }

    onChange(setHours(setMinutes(current, m), h).toISOString());
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const rows: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        rows.push(currentWeek);
        currentWeek = [];
      }
    });

    return (
      <div 
        style={{ background: '#ffffff', opacity: 1 }}
        className="p-2.5 md:p-3 text-slate-900 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-slate-200 select-none w-[280px] sm:w-[250px] z-[100]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button 
            type="button"
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1 group cursor-pointer hover:text-sky-600 transition">
             <span className="font-bold text-xs tracking-wide">
               {format(viewDate, 'MMMM yyyy')}
             </span>
             <ChevronRight size={12} className="rotate-90 text-slate-400 group-hover:text-sky-600" />
          </div>

          <button 
            type="button"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className={`text-center text-[10px] font-bold ${i === 0 || i === 6 ? 'text-rose-500/70' : 'text-slate-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {rows.map((week, wi) => (
            <React.Fragment key={wi}>
              {week.map((day, di) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);
                
                return (
                  <button
                    key={di}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`
                      h-8 w-8 rounded-lg flex flex-col items-center justify-center text-[11px] transition relative
                      ${!isCurrentMonth ? 'text-slate-200 pointer-events-none' : ''}
                      ${isSelected ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-200' : 'hover:bg-slate-50 text-slate-600'}
                      ${isToday(day) && !isSelected ? 'text-sky-600 font-bold after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-sky-600 after:rounded-full' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Time Selection */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <Clock size={10} className="text-sky-500" />
            Time Select
          </div>
          
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="flex flex-col items-center">
              <button 
                type="button" 
                onClick={() => handleTimeChange('hour', true)}
                className="text-slate-400 hover:text-sky-600 transition"
              ><ChevronLeft size={16} className="rotate-90" /></button>
              <div className="text-sm font-mono font-bold w-10 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-md my-0.5 text-slate-700">
                {format(selectedDate || new Date(), 'hh')}
              </div>
              <button 
                type="button" 
                onClick={() => handleTimeChange('hour', false)}
                className="text-slate-400 hover:text-sky-600 transition"
              ><ChevronLeft size={16} className="-rotate-90" /></button>
            </div>

            <span className="text-lg font-bold text-slate-300 pb-4">:</span>

            <div className="flex flex-col items-center">
              <button 
                type="button" 
                onClick={() => handleTimeChange('minute', true)}
                className="text-slate-400 hover:text-sky-600 transition"
              ><ChevronLeft size={16} className="rotate-90" /></button>
              <div className="text-sm font-mono font-bold w-10 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-md my-0.5 text-slate-700">
                {format(selectedDate || new Date(), 'mm')}
              </div>
              <button 
                type="button" 
                onClick={() => handleTimeChange('minute', false)}
                className="text-slate-400 hover:text-sky-600 transition"
              ><ChevronLeft size={16} className="-rotate-90" /></button>
            </div>

            <div className="pt-2">
              <button 
                type="button"
                onClick={() => handleTimeChange('ampm', true)}
                className="px-2 py-1.5 rounded-md bg-sky-50 border border-sky-100 text-[10px] font-bold text-sky-600 hover:bg-sky-100 transition"
              >
                {format(selectedDate || new Date(), 'aa')}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button 
            type="button"
            onClick={() => { onChange(''); setIsOpen(false); }}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition text-slate-400 uppercase tracking-widest"
          >
            Clear
          </button>
          
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-5 py-1.5 rounded-lg text-[10px] font-black bg-sky-500 text-white shadow-sm shadow-sky-100 hover:bg-sky-600 transition uppercase tracking-widest"
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  const formattedDisplay = selectedDate 
    ? format(selectedDate, 'MM / dd / yyyy, hh : mm aa')
    : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] mb-2 block">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2.5 w-full p-2 h-10 rounded-lg border transition cursor-pointer select-none
          ${isOpen ? 'bg-white border-sky-400 ring-2 ring-sky-400/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}
        `}
      >
        <CalendarIcon size={14} className={selectedDate ? 'text-sky-500' : 'text-slate-400'} />
        <div className="flex-1 font-mono text-[13px] tracking-widest text-slate-600 flex items-center">
          {selectedDate ? (
            formattedDisplay.split('').map((char, i) => (
              <span 
                key={i} 
                className={`${char === '/' || char === ',' || char === ':' ? 'text-slate-300 mx-0.5' : ''}`}
              >
                {char}
              </span>
            ))
          ) : (
            <span className="font-sans tracking-normal text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        {!selectedDate ? (
           <Clock size={14} className="text-slate-300" />
        ) : (
           <X 
             size={14} 
             className="text-rose-400 hover:text-rose-600 transition" 
             onClick={(e) => { e.stopPropagation(); onChange(''); }}
           />
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay - Throttled glassmorphism for performance */}
            <div 
              className="md:hidden fixed inset-0 bg-slate-900/25 backdrop-blur-[2px] z-[1050] animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={window.innerWidth > 768 ? { opacity: 0, y: -10, scale: 0.95 } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              animate={window.innerWidth > 768 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={window.innerWidth > 768 ? { opacity: 0, y: -10, scale: 0.95 } : { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={clsx(
                "z-[1100] shadow-[0_20px_70px_rgba(0,0,0,0.35)]",
                // Mobile: Fixed Center
                "fixed top-1/2 left-1/2 w-[min(90vw,300px)] md:relative md:top-auto md:left-auto",
                // Desktop: Absolute Dropdown
                "md:absolute md:top-full md:left-0 md:w-[250px] md:mt-1",
                openUpward ? "md:bottom-full md:top-auto md:mb-2" : ""
              )}
            >
              {renderCalendar()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
