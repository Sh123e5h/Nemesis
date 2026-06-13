import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Transformer } from 'react-konva';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Type, 
  Circle as CircleIcon, 
  Trash2, 
  Users,
  MousePointer2,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import Skeleton from './ui/Skeleton';

import type { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';

interface WhiteboardData {
  id: string;
  group_id: string;
  name: string;
  created_by?: string;
}

interface ElementData {
  points?: number[];
  stroke?: string;
  strokeWidth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

interface CurrentShape {
  type: 'rect' | 'circle';
  startX: number;
  startY: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

interface Element {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'text';
  data: ElementData;
  created_by: string;
}

interface WhiteboardProps {
  groupId: string;
  groupName?: string;
}

const COLORS = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Whiteboard({ groupId, groupName }: WhiteboardProps) {
  const { user } = useAuthStore();
  const [elements, setElements] = useState<Element[]>([]);
  const [tool, setTool] = useState<string>('pen');
  const [color, setColor] = useState<string>('#3b82f6');
  const [activeWhiteboard, setActiveWhiteboard] = useState<WhiteboardData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{points: number[], stroke: string, strokeWidth: number} | null>(null);
  const [currentShape, setCurrentShape] = useState<CurrentShape | null>(null); // State for dragging shapes
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWiping, setIsWiping] = useState(false);
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      const node = stageRef.current.findOne(`#el-${selectedId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
    }
  }, [selectedId, elements]);

  const fetchElements = useCallback(async (whiteboardId: string) => {
    const { data } = await supabase
      .from('whiteboard_elements')
      .select('*')
      .eq('whiteboard_id', whiteboardId)
      .order('created_at', { ascending: true });

    if (data) setElements(data as Element[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Initialize whiteboard
  useEffect(() => {
    const initWhiteboard = async () => {
      if (!groupId) return;
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(1);

      let whiteboard = data && data.length > 0 ? data[0] : null;

      if (!whiteboard) {
        const { data: newVal, error: createError } = await supabase
          .from('whiteboards')
          .insert([{ group_id: groupId, name: 'Default Whiteboard', created_by: user?.id }])
          .select()
          .single();
        
        if (createError) console.error("Error creating whiteboard:", createError);
        whiteboard = newVal;
      }

      if (whiteboard) {
        setActiveWhiteboard(whiteboard as WhiteboardData);
        fetchElements(whiteboard.id);
      }
      
      if (fetchError) console.error("Error fetching whiteboard:", fetchError);
    };

    initWhiteboard();
  }, [groupId, user?.id, fetchElements]);

  // Realtime subscription
  useEffect(() => {
    if (!activeWhiteboard?.id) return;

    const channel = supabase.channel(`whiteboard-${activeWhiteboard.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'whiteboard_elements',
        filter: `whiteboard_id=eq.${activeWhiteboard.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEl = payload.new as Element;
          setElements(prev => prev.some(el => el.id === newEl.id) ? prev : [...prev, newEl]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedEl = payload.new as Element;
          setElements(prev => prev.map(el => el.id === updatedEl.id ? updatedEl : el));
        } else if (payload.eventType === 'DELETE') {
          setElements(prev => prev.filter(el => el.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchElements(activeWhiteboard.id);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWhiteboard?.id, fetchElements]);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) setSelectedId(null);

    if (tool === 'select') return;
    setIsDrawing(true);
    
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (tool === 'pen' || tool === 'eraser') {
      setCurrentLine({
        points: [pos.x, pos.y],
        stroke: tool === 'eraser' ? '#ffffff' : color,
        strokeWidth: tool === 'eraser' ? 20 : 4,
      });
    } else if (tool === 'rect') {
      setCurrentShape({ type: 'rect', startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (tool === 'circle') {
      setCurrentShape({ type: 'circle', startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, radius: 0 });
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if ((tool === 'pen' || tool === 'eraser') && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, pos.x, pos.y]
      });
    } else if (tool === 'rect' && currentShape) {
      setCurrentShape({
        ...currentShape,
        x: Math.min(pos.x, currentShape.startX),
        y: Math.min(pos.y, currentShape.startY),
        width: Math.abs(pos.x - currentShape.startX),
        height: Math.abs(pos.y - currentShape.startY)
      });
    } else if (tool === 'circle' && currentShape) {
      const radius = Math.sqrt(Math.pow(pos.x - currentShape.startX, 2) + Math.pow(pos.y - currentShape.startY, 2));
      setCurrentShape({
        ...currentShape,
        radius
      });
    }
  };

  const handleMouseUp = async (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || !activeWhiteboard) return;
    setIsDrawing(false);
    
    const stage = e.target.getStage();
    
    if ((tool === 'pen' || tool === 'eraser') && currentLine && currentLine.points.length > 2) {
       const newElement = {
         id: crypto.randomUUID(),
         whiteboard_id: activeWhiteboard.id,
         type: 'line' as const,
         data: currentLine,
         created_by: user?.id || ''
       };
       setElements(prev => [...prev, newElement]);
       setCurrentLine(null);
       const { error } = await supabase.from('whiteboard_elements').insert([newElement]);
       if (error) {
         console.error("Error inserting pen element:", error);
         setElements(prev => prev.filter(el => el.id !== newElement.id)); // Rollback on error
       }
    } else if (tool === 'rect' && currentShape && (currentShape.width ?? 0) > 2 && (currentShape.height ?? 0) > 2) {
        const newElement = {
          id: crypto.randomUUID(),
          whiteboard_id: activeWhiteboard.id,
          type: 'rect' as const,
          data: { x: currentShape.x, y: currentShape.y, width: currentShape.width!, height: currentShape.height!, fill: color + '33', stroke: color, strokeWidth: 2 },
          created_by: user?.id || ''
        };
        setElements(prev => [...prev, newElement]);
        setCurrentShape(null);
        const { error } = await supabase.from('whiteboard_elements').insert([newElement]);
        if (error) {
          console.error("Error inserting rect element:", error);
          setElements(prev => prev.filter(el => el.id !== newElement.id)); // Rollback on error
        }
    } else if (tool === 'circle' && currentShape && (currentShape.radius ?? 0) > 2) {
        const newElement = {
          id: crypto.randomUUID(),
          whiteboard_id: activeWhiteboard.id,
          type: 'circle' as const,
          data: { x: currentShape.startX, y: currentShape.startY, radius: currentShape.radius!, fill: color + '33', stroke: color, strokeWidth: 2 },
          created_by: user?.id || ''
        };
        setElements(prev => [...prev, newElement]);
        setCurrentShape(null);
        const { error } = await supabase.from('whiteboard_elements').insert([newElement]);
        if (error) {
          console.error("Error inserting circle element:", error);
          setElements(prev => prev.filter(el => el.id !== newElement.id)); // Rollback on error
        }
    } else if (tool === 'text') {
        const stagePos = stage?.getPointerPosition();
        if (stagePos) {
          setTextInput({ x: stagePos.x, y: stagePos.y });
        }
    }
    setCurrentLine(null);
    setCurrentShape(null);
  };

  const handleTextInputSubmit = async (text: string) => {
    if (!text || !activeWhiteboard || !textInput) {
      setTextInput(null);
      return;
    }

    const newElement = {
      id: crypto.randomUUID(),
      whiteboard_id: activeWhiteboard.id,
      type: 'text' as const,
      data: { x: textInput.x, y: textInput.y, text, fill: color, fontSize: 20 },
      created_by: user?.id || ''
    };

    setElements(prev => [...prev, newElement]);
    setTextInput(null);

    const { error } = await supabase.from('whiteboard_elements').insert([newElement]);
    if (error) {
      console.error("Error inserting text element:", error);
      setElements(prev => prev.filter(el => el.id !== newElement.id));
      setStatusMessage({ text: 'Failed to add text', type: 'error' });
    }
  };

  const handleModifyEnd = async (id: string, e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    // Extract new transformation properties
    const elIndex = elements.findIndex(el => el.id === id);
    if (elIndex === -1) return;
    
    const newData = {
      ...elements[elIndex].data,
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    };

    setElements(prev => prev.map(el => el.id === id ? { ...el, data: newData } : el));

    const { error } = await supabase
      .from('whiteboard_elements')
      .update({ data: newData })
      .eq('id', id);

    if (error) console.error("Error saving resize/drag:", error);
  };

  const handleExport = () => {
    if (!stageRef.current) return;
    
    // Get high-quality image of the canvas (transparent background)
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    
    // Create a temporary canvas to draw the white background and text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 1. Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 2. Draw the whiteboard elements
      ctx.drawImage(img, 0, 0);
      
      // 3. Draw the group name watermark at the bottom left
      if (groupName) {
        ctx.fillStyle = '#94a3b8'; // slate-400
        ctx.font = 'bold 32px Outfit, system-ui, -apple-system, sans-serif'; // Scaled for pixelRatio: 2, using app's premium font
        ctx.fillText(`Nemesis Whiteboard: ${groupName}`, 40, canvas.height - 40);
      }
      
      // Trigger download
      const finalDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `whiteboard-${groupId}-${new Date().getTime()}.png`;
      link.href = finalDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = dataUrl;
  };

  const handleDelete = useCallback(async () => {
    if (!activeWhiteboard) return;

    if (selectedId) {
      const originalElements = [...elements];
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);

      const { error } = await supabase
        .from('whiteboard_elements')
        .delete()
        .eq('id', selectedId);
      
      if (error) {
        console.error("Error deleting element:", error);
        setElements(originalElements);
        setStatusMessage({ text: 'Error deleting element', type: 'error' });
      }
    } else {
      setIsWiping(true);
    }
  }, [activeWhiteboard, selectedId, elements]);

  const handleWipeAll = async () => {
    if (!activeWhiteboard) return;
    
    const originalElements = [...elements];
    setElements([]);
    setIsWiping(false);

    const { error } = await supabase
      .from('whiteboard_elements')
      .delete()
      .eq('whiteboard_id', activeWhiteboard.id);
    
    if (error) {
      console.error("Error clearing board:", error);
      setElements(originalElements);
      setStatusMessage({ text: 'Error clearing board', type: 'error' });
    } else {
      setStatusMessage({ text: 'Whiteboard cleared', type: 'success' });
    }
  };

  // Keyboard support for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // Prevent backspace from navigating away if focused on something else
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, activeWhiteboard, handleDelete]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
        {/* Skeleton Toolbar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} variant="rect" className="w-9 h-9 rounded-lg" />)}
          </div>
          <div className="flex gap-2">
            <Skeleton variant="rect" className="w-24 h-9 rounded-xl" />
            <Skeleton variant="rect" className="w-9 h-9 rounded-lg" />
          </div>
        </div>
        {/* Skeleton Canvas Area */}
        <div className="flex-1 p-8 flex items-center justify-center bg-slate-50/50">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton variant="text" className="w-3/4 h-4 mx-auto" />
            <Skeleton variant="rect" className="w-full h-64 rounded-3xl opacity-50" />
            <div className="flex justify-center gap-3">
               {[1, 2, 3].map(i => <Skeleton key={i} variant="circle" className="w-3 h-3" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
      {/* Whiteboard Toolbar */}
      <div className="bg-white p-2 md:p-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setTool('select')}
            className={`p-2 rounded-lg transition ${tool === 'select' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Select"
          >
            <MousePointer2 size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition ${tool === 'pen' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Pen"
          >
            <Pencil size={18} />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition ${tool === 'eraser' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button 
            onClick={() => setTool('rect')}
            className={`p-2 rounded-lg transition ${tool === 'rect' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Rectangle"
          >
            <Square size={18} />
          </button>
          <button 
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition ${tool === 'circle' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Circle"
          >
            <CircleIcon size={18} />
          </button>
          <button 
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition ${tool === 'text' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            title="Text"
          >
            <Type size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
           <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
             {COLORS.map(c => (
               <button 
                 key={c}
                 onClick={() => setColor(c)}
                 className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white ring-2 ring-sky-500 scale-110' : 'border-transparent'}`}
                 style={{ backgroundColor: c }}
               />
             ))}
           </div>
           
           <div className="w-px h-6 bg-slate-200 mx-1" />
           
           <button 
             onClick={handleExport}
             className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition"
             title="Save Image"
           >
             <Download size={18} />
           </button>

           <button 
             onClick={handleDelete}
             className={`p-2 rounded-lg transition ${selectedId ? 'text-rose-600 bg-rose-50 ring-2 ring-rose-200' : 'text-rose-500 hover:bg-rose-50'}`}
             title={selectedId ? "Delete Selected" : "Clear All"}
           >
             <Trash2 size={18} />
           </button>

           {isWiping && (
             <button 
               onClick={handleWipeAll}
               className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-lg hover:bg-rose-700 animate-in zoom-in slide-in-from-right-4"
             >
               Wipe Board?
             </button>
           )}
           
           {isWiping && (
             <button 
               onClick={() => setIsWiping(false)}
               className="p-1 px-2 text-slate-500 text-xs hover:bg-slate-100 rounded-md"
             >
               Cancel
             </button>
           )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] cursor-crosshair relative overflow-hidden">
        <Stage
          width={1000}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          ref={stageRef}
          className="bg-transparent"
        >
          <Layer>
            {elements.map((el) => {
              const isEraser = el.data.stroke === '#ffffff' && el.data.strokeWidth === 20;
              const commonProps = {
                key: el.id,
                id: `el-${el.id}`,
                ...el.data,
                draggable: tool === 'select' && !isEraser,
                listening: !isEraser,
                onClick: () => { if (tool === 'select' && !isEraser) setSelectedId(el.id); },
                onTap: () => { if (tool === 'select' && !isEraser) setSelectedId(el.id); },
                onDragEnd: (e: KonvaEventObject<DragEvent>) => handleModifyEnd(el.id, e),
                onTransformEnd: (e: KonvaEventObject<Event>) => handleModifyEnd(el.id, e as KonvaEventObject<DragEvent>)
              };

              if (el.type === 'line') {
                const isEraser = el.data.stroke === '#ffffff' && el.data.strokeWidth === 20;
                return <Line {...commonProps} tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation={isEraser ? 'destination-out' : 'source-over'} />;
              } else if (el.type === 'rect') {
                return <Rect {...commonProps} />;
              } else if (el.type === 'circle') {
                return <Circle {...commonProps} />;
              } else if (el.type === 'text') {
                return <KonvaText {...commonProps} />;
              }
              return null;
            })}
            {selectedId && <Transformer ref={trRef} boundBoxFunc={(oldBox, newBox) => newBox.width < 5 || newBox.height < 5 ? oldBox : newBox} />}
            {currentLine && (
              <Line {...currentLine} tension={0.5} lineCap="round" lineJoin="round" globalCompositeOperation={currentLine.stroke === '#ffffff' && currentLine.strokeWidth === 20 ? 'destination-out' : 'source-over'} />
            )}
            {currentShape && currentShape.type === 'rect' && (
              <Rect x={currentShape.x} y={currentShape.y} width={currentShape.width} height={currentShape.height} fill={color + '33'} stroke={color} strokeWidth={2} />
            )}
            {currentShape && currentShape.type === 'circle' && (
              <Circle x={currentShape.startX} y={currentShape.startY} radius={currentShape.radius} fill={color + '33'} stroke={color} strokeWidth={2} />
            )}
          </Layer>
        </Stage>

        {textInput && (
          <div 
            className="absolute bg-white p-2 rounded-lg shadow-xl border border-sky-200 z-20 animate-in fade-in zoom-in"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              autoFocus
              className="px-2 py-1 outline-none text-slate-800"
              placeholder="Type something..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextInputSubmit((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setTextInput(null);
              }}
              onBlur={(e) => handleTextInputSubmit(e.target.value)}
            />
          </div>
        )}

        {statusMessage && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-30 animate-in slide-in-from-top-4 ${
            statusMessage.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            {statusMessage.text}
          </div>
        )}
        
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
          <Users size={14} className="text-sky-500" />
          <span>Real-time Sync Active</span>
        </div>
      </div>
    </div>
  );
}
