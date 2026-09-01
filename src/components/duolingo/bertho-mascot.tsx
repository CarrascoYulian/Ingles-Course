'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'thinking';

export interface BerthoMascotProps {
  mood?: MascotMood;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpeechBubble?: boolean;
  customMessage?: string;
  onSpin?: () => void;
}

export function BerthoMascot({
  mood = 'idle',
  className,
  size = 'md',
  showSpeechBubble = true,
  customMessage,
}: BerthoMascotProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [blink, setBlink] = useState(false);

  // Parpadeo automático natural
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  // Giro lúdico automático periódico en modo idle
  useEffect(() => {
    if (mood !== 'idle') return;
    const spinInterval = setInterval(() => {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 1200);
    }, 8000);
    return () => clearInterval(spinInterval);
  }, [mood]);

  // Si cambia el mood a happy, trigger un salto y giro celebratorio
  useEffect(() => {
    if (mood === 'happy') {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 1400);
    }
  }, [mood]);

  const sizeStyles = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  }[size];

  const speechMessages: Record<MascotMood, string> = {
    idle: '¡Practiquemos inglés juntos! Let’s go! 🚀',
    happy: '¡Increíble! ¡Respuesta correcta! 🎉✨',
    sad: '¡Casi! No te preocupes, ¡tú puedes en la próxima! 💪',
    thinking: 'Mmm... ¿cuál será la respuesta correcta? 🤔',
  };

  const currentMessage = customMessage || speechMessages[mood];

  return (
    <div className={cn('relative flex flex-col items-center select-none', className)}>
      {/* Globo de diálogo animado */}
      <AnimatePresence mode="wait">
        {showSpeechBubble && (
          <motion.div
            key={mood + (customMessage || '')}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              'relative mb-3 max-w-[240px] rounded-2xl px-3.5 py-2 text-center text-caption font-extrabold shadow-md',
              mood === 'happy'
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : mood === 'sad'
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : mood === 'thinking'
                    ? 'bg-blue-600 text-white shadow-blue-600/20'
                    : 'border border-slate-200 bg-white text-slate-800 shadow-slate-200/50',
            )}
          >
            <span>{currentMessage}</span>
            {/* Flecha inferior del globo */}
            <div
              className={cn(
                'absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 rounded-sm',
                mood === 'happy'
                  ? 'bg-emerald-500'
                  : mood === 'sad'
                    ? 'bg-amber-500'
                    : mood === 'thinking'
                      ? 'bg-blue-600'
                      : 'bg-white border-b border-r border-slate-200',
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenedor del animal mascota con animación de flotación y giro */}
      <motion.div
        animate={
          mood === 'happy'
            ? {
                y: [0, -22, -4, -16, 0],
                rotate: isSpinning ? [0, 360] : [0, -6, 6, -4, 0],
                scale: [1, 1.15, 1.05, 1.1, 1],
              }
            : mood === 'sad'
              ? {
                  y: [0, 6, 2, 4, 0],
                  rotate: [0, -4, -2, -3, 0],
                  scale: [1, 0.95, 0.97, 1],
                }
              : mood === 'thinking'
                ? {
                    y: [0, -4, 0],
                    rotate: [0, 8, 4, 8, 0],
                  }
                : {
                    y: [0, -6, 0],
                    rotate: isSpinning ? [0, 360] : 0,
                  }
        }
        transition={
          isSpinning
            ? { duration: 1.1, ease: 'easeInOut' }
            : { repeat: Infinity, duration: mood === 'happy' ? 1.4 : 3.2, ease: 'easeInOut' }
        }
        onClick={() => {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 1100);
        }}
        className={cn('relative cursor-pointer group', sizeStyles)}
        title="¡Haz clic en Bertho para verlo dar vueltas!"
      >
        {/* Efectos de celebración alrededor cuando acierta */}
        {mood === 'happy' && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.1 }}
              className="absolute -top-3 -right-2 text-amber-400 pointer-events-none"
            >
              <Sparkles className="size-6 animate-spin" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.3, delay: 0.3 }}
              className="absolute -top-2 -left-2 text-emerald-400 pointer-events-none"
            >
              <Sparkles className="size-5" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.1, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.1, delay: 0.5 }}
              className="absolute -bottom-1 -right-2 text-blue-400 pointer-events-none"
            >
              <Heart className="size-5 fill-rose-500 text-rose-500" />
            </motion.div>
          </>
        )}

        {/* Lágrimas animadas cayendo cuando falla */}
        {mood === 'sad' && (
          <>
            <motion.div
              initial={{ y: 0, opacity: 0, scale: 0.5 }}
              animate={{ y: [0, 14, 26], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
              className="absolute top-[48%] left-[28%] size-2 rounded-full bg-blue-400 shadow-sm pointer-events-none"
            />
            <motion.div
              initial={{ y: 0, opacity: 0, scale: 0.5 }}
              animate={{ y: [0, 14, 26], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.6 }}
              className="absolute top-[48%] right-[28%] size-2 rounded-full bg-blue-400 shadow-sm pointer-events-none"
            />
          </>
        )}

        {/* Mascota Vectorial: "Bertho" - El simpático búho/halcón aviador inteligente */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-[0_10px_16px_rgba(30,58,138,0.18)]"
        >
          <defs>
            {/* Gradientes del plumaje de Bertho */}
            <linearGradient id="berthoBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="berthoBellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="berthoBeakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="berthoHeadphoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>

          {/* Sombra base en el piso */}
          <ellipse cx="80" cy="150" rx="38" ry="6" fill="#0f172a" opacity="0.18" />

          {/* Patitas de Bertho */}
          <path d="M60 140 L54 148 M60 140 L60 150 M60 140 L66 148" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M100 140 L94 148 M100 140 L100 150 M100 140 L106 148" stroke="#f59e0b" strokeWidth="4.5" strokeLinecap="round" />

          {/* Cuerpo principal redondeado */}
          <ellipse cx="80" cy="88" rx="48" ry="52" fill="url(#berthoBodyGrad)" />

          {/* Pechito blanco suave */}
          <path
            d="M52 82 C52 118, 108 118, 108 82 C108 64, 52 64, 52 82 Z"
            fill="url(#berthoBellyGrad)"
          />

          {/* Plumaje decorativo en el pecho */}
          <path d="M72 88 Q80 94 88 88" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M68 98 Q80 104 92 98" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" />

          {/* Ala izquierda (reacciona al mood) */}
          <motion.path
            d={
              mood === 'happy'
                ? 'M34 82 C18 60, 20 40, 36 34 C44 48, 42 70, 34 82 Z' // Levantada en victoria
                : mood === 'sad'
                  ? 'M34 88 C20 95, 22 120, 32 124 C40 115, 42 98, 34 88 Z' // Caída triste
                  : mood === 'thinking'
                    ? 'M34 82 C22 68, 38 52, 54 62 C46 74, 40 82, 34 82 Z' // Hacia la barbilla
                    : 'M34 82 C20 86, 22 110, 34 116 C42 108, 42 92, 34 82 Z'
            }
            fill="#1e40af"
          />

          {/* Ala derecha (reacciona al mood) */}
          <motion.path
            d={
              mood === 'happy'
                ? 'M126 82 C142 60, 140 40, 124 34 C116 48, 118 70, 126 82 Z' // Levantada en victoria
                : mood === 'sad'
                  ? 'M126 88 C140 95, 138 120, 128 124 C120 115, 118 98, 126 88 Z' // Caída triste
                  : 'M126 82 C140 86, 138 110, 126 116 C118 108, 118 92, 126 82 Z'
            }
            fill="#1e40af"
          />

          {/* Mechoncito de plumas en la cabeza */}
          <path d="M78 38 Q80 20 90 28 Q82 32 82 40 Z" fill="#1d4ed8" />

          {/* OJOS según el estado emocional */}
          {mood === 'happy' ? (
            /* Ojos felices estrellados/curvos ^ _ ^ */
            <g stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M56 68 Q64 56 72 68" />
              <path d="M88 68 Q96 56 104 68" />
              {/* Sonrojo tierno en mejillas */}
              <circle cx="50" cy="76" r="6" fill="#f43f5e" opacity="0.4" stroke="none" />
              <circle cx="110" cy="76" r="6" fill="#f43f5e" opacity="0.4" stroke="none" />
            </g>
          ) : mood === 'sad' ? (
            /* Ojos tristes (╥ ﹏ ╥) */
            <g>
              {/* Ojo izquierdo caído */}
              <circle cx="64" cy="68" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
              <circle cx="64" cy="70" r="5.5" fill="#1e293b" />
              <circle cx="62" cy="67" r="2.2" fill="#ffffff" />
              {/* Ceja triste izquierda */}
              <path d="M54 56 Q64 62 74 58" fill="none" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />

              {/* Ojo derecho caído */}
              <circle cx="96" cy="68" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
              <circle cx="96" cy="70" r="5.5" fill="#1e293b" />
              <circle cx="94" cy="67" r="2.2" fill="#ffffff" />
              {/* Ceja triste derecha */}
              <path d="M86 58 Q96 62 106 56" fill="none" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          ) : blink ? (
            /* Ojos cerrados por parpadeo */
            <g stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none">
              <line x1="56" y1="68" x2="72" y2="68" />
              <line x1="88" y1="68" x2="104" y2="68" />
            </g>
          ) : (
            /* Ojos normales inteligentes y atentos */
            <g>
              <circle cx="64" cy="66" r="12" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="65" cy="66" r="6.5" fill="#0f172a" />
              <circle cx="63" cy="63" r="2.8" fill="#ffffff" />

              <circle cx="96" cy="66" r="12" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="95" cy="66" r="6.5" fill="#0f172a" />
              <circle cx="93" cy="63" r="2.8" fill="#ffffff" />

              {/* Sonrojo suave */}
              <circle cx="50" cy="76" r="5" fill="#f43f5e" opacity="0.25" />
              <circle cx="110" cy="76" r="5" fill="#f43f5e" opacity="0.25" />
            </g>
          )}

          {/* Pico de Bertho */}
          <polygon
            points="73,73 87,73 80,85"
            fill="url(#berthoBeakGrad)"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Audífonos gamer/language learner de Bertho */}
          {/* Diadema */}
          <path
            d="M36 62 C36 28, 124 28, 124 62"
            fill="none"
            stroke="#334155"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Auricular Izquierdo */}
          <rect x="28" y="56" width="12" height="24" rx="6" fill="url(#berthoHeadphoneGrad)" stroke="#7f1d1d" strokeWidth="1.5" />
          {/* Auricular Derecho */}
          <rect x="120" y="56" width="12" height="24" rx="6" fill="url(#berthoHeadphoneGrad)" stroke="#7f1d1d" strokeWidth="1.5" />
          {/* Micrófono */}
          <path d="M34 76 Q38 90 52 88" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <circle cx="53" cy="88" r="3.5" fill="#ef4444" />
        </svg>
      </motion.div>

      {/* Botón flotante para interactuar / hacerlo girar */}
      <button
        type="button"
        onClick={() => {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 1100);
        }}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-brand transition-colors"
        title="Girar a Bertho"
      >
        <RefreshCw aria-hidden size={11} className={cn('transition-transform', isSpinning && 'animate-spin')} />
        <span>Girar Bertho</span>
      </button>
    </div>
  );
}
