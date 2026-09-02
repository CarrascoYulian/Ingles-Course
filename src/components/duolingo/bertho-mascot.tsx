'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, RefreshCw, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'thinking';

// 3 Movimientos naturales mientras juega:
// 1. 'wag': Respiración suave, olfateo y colita moviéndose alegremente.
// 2. 'spin': Salto y giro acrobático de 360° con chispas.
// 3. 'curious': Inclinación de cabeza, orejita levantada y golpecito de patita.
export type IdleSubMotion = 'wag' | 'spin' | 'curious';

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
  const [idleMotion, setIdleMotion] = useState<IdleSubMotion>('wag');

  // Parpadeo automático orgánico
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  // Rotación cíclica entre los 3 movimientos mientras el estudiante juega
  useEffect(() => {
    if (mood !== 'idle') return;

    const motions: IdleSubMotion[] = ['wag', 'curious', 'spin'];
    let currentIndex = 0;

    const motionInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % motions.length;
      const nextMotion = motions[currentIndex]!;
      setIdleMotion(nextMotion);

      if (nextMotion === 'spin') {
        setIsSpinning(true);
        setTimeout(() => setIsSpinning(false), 1200);
      }
    }, 4500);

    return () => clearInterval(motionInterval);
  }, [mood]);

  // Si cambia el mood a happy, trigger un salto y giro celebratorio
  useEffect(() => {
    if (mood === 'happy') {
      setIsSpinning(true);
      setTimeout(() => setIsSpinning(false), 1300);
    }
  }, [mood]);

  const sizeStyles = {
    sm: 'w-28 h-28',
    md: 'w-40 h-40',
    lg: 'w-52 h-52',
  }[size];

  const speechMessages: Record<MascotMood, string> = {
    idle: idleMotion === 'curious'
      ? '¡Woof! ¡Vamos a aprender inglés juntos! 🐾'
      : idleMotion === 'spin'
        ? '¡Woof! ¡Mírame dar vueltas! 🐶✨'
        : '¡Estoy listo para la siguiente pregunta! Let’s go! 🚀',
    happy: '¡Guau! ¡Excelente respuesta! ¡Buen trabajo! 🎉🍖',
    sad: '¡Casi! No te preocupes, ¡vamos a por la siguiente! 🐾❤️',
    thinking: 'Mmm... olfateo que esta respuesta requiere concentración 🤔',
  };

  const currentMessage = customMessage || speechMessages[mood];

  return (
    <div className={cn('relative flex flex-col items-center select-none', className)}>
      {/* Globo de diálogo animado */}
      <AnimatePresence mode="wait">
        {showSpeechBubble && (
          <motion.div
            key={mood + (customMessage || '') + (mood === 'idle' ? idleMotion : '')}
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
                    : 'border border-slate-200 bg-white text-slate-800 shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:shadow-none',
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
                      : 'bg-white border-b border-r border-slate-200 dark:bg-slate-800 dark:border-slate-700',
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenedor del perro Bertho con movimientos fluidos y no rígidos */}
      <motion.div
        animate={
          mood === 'happy'
            ? {
                y: [0, -26, -6, -18, 0],
                rotate: isSpinning ? [0, 360] : [0, -8, 8, -4, 0],
                scale: [1, 1.15, 1.05, 1.1, 1],
              }
            : mood === 'sad'
              ? {
                  y: [0, 5, 1, 3, 0],
                  rotate: [0, -5, -2, -4, 0],
                  scale: [1, 0.94, 0.97, 1],
                }
              : mood === 'thinking'
                ? {
                    y: [0, -5, 0],
                    rotate: [0, 10, 6, 10, 0],
                  }
                : idleMotion === 'curious'
                  ? {
                      y: [0, -6, 0, -4, 0],
                      rotate: [0, -8, 4, -4, 0],
                      scale: [1, 1.03, 1],
                    }
                  : idleMotion === 'spin'
                    ? {
                        y: [0, -20, 0],
                        rotate: [0, 360],
                      }
                    : {
                        y: [0, -5, 0],
                        rotate: [0, 2, -2, 0],
                      }
        }
        transition={
          isSpinning || idleMotion === 'spin'
            ? { duration: 1.15, ease: [0.34, 1.56, 0.64, 1] }
            : { repeat: Infinity, duration: mood === 'happy' ? 1.3 : 2.8, ease: 'easeInOut' }
        }
        onClick={() => {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 1100);
        }}
        className={cn('relative cursor-pointer group', sizeStyles)}
        title="¡Haz clic en Bertho el perrito para verlo dar vueltas!"
      >
        {/* Efectos de celebración alrededor cuando acierta */}
        {mood === 'happy' && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.1, delay: 0.1 }}
              className="absolute -top-3 -right-2 text-amber-400 pointer-events-none"
            >
              <Sparkles className="size-6 animate-spin" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
              className="absolute -top-2 -left-2 text-emerald-400 pointer-events-none"
            >
              <Sparkles className="size-5" />
            </motion.div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.1, delay: 0.5 }}
              className="absolute -bottom-1 -right-2 text-rose-400 pointer-events-none"
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
              className="absolute top-[50%] left-[28%] size-2 rounded-full bg-blue-400 shadow-sm pointer-events-none"
            />
            <motion.div
              initial={{ y: 0, opacity: 0, scale: 0.5 }}
              animate={{ y: [0, 14, 26], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: 0.6 }}
              className="absolute top-[50%] right-[28%] size-2 rounded-full bg-blue-400 shadow-sm pointer-events-none"
            />
          </>
        )}

        {/* Mascota Vectorial: "Bertho" - El perrito inteligente y carismático */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full drop-shadow-[0_10px_18px_rgba(180,83,9,0.2)]"
        >
          <defs>
            {/* Gradientes dorados/canela del pelaje de Bertho el perro */}
            <linearGradient id="dogFurGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="dogEarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="dogSnoutGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="dogCollarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* Sombra base en el piso */}
          <ellipse cx="80" cy="150" rx="42" ry="6.5" fill="#0f172a" opacity="0.16" />

          {/* Colita del perrito con animación de movimiento continuo (tail wagging) */}
          <motion.path
            d="M122 108 Q144 94 138 78 Q130 84 116 102 Z"
            fill="url(#dogEarGrad)"
            animate={{
              rotate: mood === 'happy' ? [0, 26, -18, 26, 0] : [0, 14, -10, 14, 0],
              transformOrigin: '116px 102px',
            }}
            transition={{
              repeat: Infinity,
              duration: mood === 'happy' ? 0.45 : 0.85,
              ease: 'easeInOut',
            }}
          />

          {/* Patitas traseras */}
          <ellipse cx="44" cy="134" rx="14" ry="10" fill="#d97706" />
          <ellipse cx="116" cy="134" rx="14" ry="10" fill="#d97706" />

          {/* Cuerpo principal del perro */}
          <ellipse cx="80" cy="98" rx="44" ry="46" fill="url(#dogFurGrad)" />

          {/* Pechito blanco esponjoso */}
          <path
            d="M56 94 C56 126, 104 126, 104 94 C104 80, 56 80, 56 94 Z"
            fill="url(#dogSnoutGrad)"
          />

          {/* Patitas delanteras */}
          <motion.g
            animate={
              idleMotion === 'curious'
                ? { y: [0, -5, 0], rotate: [0, -6, 0] }
                : { y: 0 }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="60" cy="142" rx="11" ry="8" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
            <path d="M55 142 L55 147 M60 142 L60 148 M65 142 L65 147" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
          <ellipse cx="100" cy="142" rx="11" ry="8" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
          <path d="M95 142 L95 147 M100 142 L100 148 M105 142 L105 147" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />

          {/* Collar azul de Bertho con medallita */}
          <path d="M50 118 Q80 128 110 118" fill="none" stroke="url(#dogCollarGrad)" strokeWidth="7" strokeLinecap="round" />
          {/* Medallita de estrella dorada */}
          <circle cx="80" cy="126" r="6.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <path d="M80 122 L81.5 125 L85 125.5 L82.5 127.5 L83.5 131 L80 129 L76.5 131 L77.5 127.5 L75 125.5 L78.5 125 Z" fill="#ffffff" />

          {/* Cabeza del perrito */}
          <ellipse cx="80" cy="64" rx="38" ry="34" fill="url(#dogFurGrad)" />

          {/* Orejita izquierda del perro con animación viva (ears flopping) */}
          <motion.path
            d={
              mood === 'happy'
                ? 'M48 44 C26 30, 20 54, 30 76 C40 82, 54 64, 48 44 Z' // Oreja levantada feliz
                : mood === 'sad'
                  ? 'M48 48 C24 58, 24 94, 36 98 C44 88, 52 70, 48 48 Z' // Oreja caída triste
                  : idleMotion === 'curious'
                    ? 'M48 42 C24 24, 20 48, 32 72 C42 78, 54 60, 48 42 Z' // Oreja atenta
                    : 'M48 46 C26 42, 22 74, 34 84 C42 80, 52 66, 48 46 Z'
            }
            fill="url(#dogEarGrad)"
            animate={{
              rotate: mood === 'happy' ? [0, -6, 4, 0] : [0, 3, -3, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Orejita derecha del perro */}
          <motion.path
            d={
              mood === 'happy'
                ? 'M112 44 C134 30, 140 54, 130 76 C120 82, 106 64, 112 44 Z' // Oreja levantada feliz
                : mood === 'sad'
                  ? 'M112 48 C136 58, 136 94, 124 98 C116 88, 108 70, 112 48 Z' // Oreja caída triste
                  : 'M112 46 C134 42, 138 74, 126 84 C118 80, 108 66, 112 46 Z'
            }
            fill="url(#dogEarGrad)"
            animate={{
              rotate: mood === 'happy' ? [0, 6, -4, 0] : [0, -3, 3, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Hocico / Morro blanco del perro */}
          <ellipse cx="80" cy="74" rx="22" ry="16" fill="url(#dogSnoutGrad)" />

          {/* Nariz negra brillante */}
          <path d="M72 65 Q80 62 88 65 Q85 73 80 75 Q75 73 72 65 Z" fill="#1e293b" />
          <ellipse cx="77" cy="65" rx="2.5" ry="1.2" fill="#ffffff" />

          {/* Sonrisa / Boquita del perro */}
          {mood === 'happy' ? (
            /* Boquita abierta con lengüita feliz */
            <g>
              <path d="M73 75 Q80 81 87 75" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M75 78 Q80 92 85 78 Z" fill="#f43f5e" stroke="#e11d48" strokeWidth="1.2" />
            </g>
          ) : mood === 'sad' ? (
            /* Boquita triste curvada hacia abajo */
            <path d="M74 81 Q80 75 86 81" fill="none" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
          ) : (
            /* Boquita tierna de perrito */
            <path d="M74 75 Q80 80 86 75" fill="none" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
          )}

          {/* OJOS según el estado emocional */}
          {mood === 'happy' ? (
            /* Ojos felices estrellados/curvos de perrito ^ _ ^ */
            <g stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M58 54 Q67 42 75 54" />
              <path d="M85 54 Q93 42 102 54" />
              {/* Sonrojo tierno en mejillas */}
              <circle cx="52" cy="68" r="6" fill="#f43f5e" opacity="0.4" stroke="none" />
              <circle cx="108" cy="68" r="6" fill="#f43f5e" opacity="0.4" stroke="none" />
            </g>
          ) : mood === 'sad' ? (
            /* Ojos de perrito triste (puppy dog eyes) */
            <g>
              {/* Ojo izquierdo caído */}
              <circle cx="66" cy="52" r="9.5" fill="#1e293b" />
              <circle cx="63" cy="49" r="4.2" fill="#ffffff" />
              <circle cx="68" cy="55" r="1.8" fill="#ffffff" />
              <path d="M56 42 Q66 48 74 44" fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />

              {/* Ojo derecho caído */}
              <circle cx="94" cy="52" r="9.5" fill="#1e293b" />
              <circle cx="91" cy="49" r="4.2" fill="#ffffff" />
              <circle cx="96" cy="55" r="1.8" fill="#ffffff" />
              <path d="M86 44 Q94 48 104 42" fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            </g>
          ) : blink ? (
            /* Ojos cerrados por parpadeo */
            <g stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <line x1="58" y1="53" x2="74" y2="53" />
              <line x1="86" y1="53" x2="102" y2="53" />
            </g>
          ) : (
            /* Ojos grandes, inteligentes y expresivos de perrito */
            <g>
              {/* Ojo izquierdo */}
              <circle cx="66" cy="52" r="10" fill="#1e293b" />
              <circle cx="63" cy="49" r="4.5" fill="#ffffff" />
              <circle cx="68" cy="55" r="1.8" fill="#ffffff" />
              {/* Mancha sobre el ojo estilo Beagle/Corgi */}
              <path d="M58 41 Q66 36 74 41" fill="none" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" />

              {/* Ojo derecho */}
              <circle cx="94" cy="52" r="10" fill="#1e293b" />
              <circle cx="91" cy="49" r="4.5" fill="#ffffff" />
              <circle cx="96" cy="55" r="1.8" fill="#ffffff" />
              <path d="M86 41 Q94 36 102 41" fill="none" stroke="#b45309" strokeWidth="2.8" strokeLinecap="round" />

              {/* Sonrojo suave */}
              <circle cx="52" cy="68" r="5" fill="#f43f5e" opacity="0.25" />
              <circle cx="108" cy="68" r="5" fill="#f43f5e" opacity="0.25" />
            </g>
          )}

          {/* Audífonos gamer/scholar de Bertho */}
          <path
            d="M44 46 C44 14, 116 14, 116 46"
            fill="none"
            stroke="#1e293b"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Auricular Izquierdo */}
          <rect x="36" y="38" width="10" height="22" rx="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          {/* Auricular Derecho */}
          <rect x="114" y="38" width="10" height="22" rx="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
        </svg>
      </motion.div>

      {/* Botón interactivo para hacerlo girar */}
      <button
        type="button"
        onClick={() => {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 1100);
        }}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-brand transition-colors"
        title="Hacer girar a Bertho"
      >
        <RefreshCw aria-hidden size={11} className={cn('transition-transform', isSpinning && 'animate-spin')} />
        <span>Girar Bertho</span>
      </button>
    </div>
  );
}

/**
 * Animación a pantalla completa cuando el estudiante pasa de nivel:
 * Bertho corre por la pantalla, da una vuelta acrobática 360°,
 * deja una estela de huellas y estrellas brillantes, y felicita al estudiante.
 */
export function BerthoLevelUpCelebration({
  open,
  onClose,
  levelTitle = '¡Nivel Completado!',
}: {
  open: boolean;
  onClose: () => void;
  levelTitle?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 select-none animate-fade-in">
      {/* Estela de huellas y partículas brillantes a lo largo de la pantalla */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { x: '10%', y: '45%', delay: 0.1 },
          { x: '25%', y: '35%', delay: 0.3 },
          { x: '40%', y: '48%', delay: 0.5 },
          { x: '55%', y: '32%', delay: 0.7 },
          { x: '70%', y: '44%', delay: 0.9 },
          { x: '85%', y: '36%', delay: 1.1 },
        ].map((paw, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
            transition={{ delay: paw.delay, duration: 0.6 }}
            style={{ left: paw.x, top: paw.y }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          >
            <div className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]">
              {/* Huella de perrito brillante */}
              <svg viewBox="0 0 40 40" className="size-10 fill-amber-300">
                <circle cx="12" cy="12" r="4.5" />
                <circle cx="28" cy="12" r="4.5" />
                <circle cx="6" cy="22" r="3.8" />
                <circle cx="34" cy="22" r="3.8" />
                <ellipse cx="20" cy="27" rx="9" ry="7.5" />
              </svg>
            </div>
            <Sparkles className="size-5 text-yellow-300 animate-ping mt-1" />
          </motion.div>
        ))}
      </div>

      {/* Tarjeta central de felicitación */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className="relative z-10 max-w-md w-full rounded-3xl bg-gradient-to-b from-blue-600 via-indigo-700 to-slate-900 p-7 text-white text-center shadow-2xl border border-blue-400/40"
      >
        {/* Bertho cruzando y dando un giro en el centro */}
        <motion.div
          initial={{ x: -90, rotate: 0 }}
          animate={{ x: [ -90, 0, 0 ], rotate: [0, 360, 720] }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="mx-auto size-36 mb-2"
        >
          <BerthoMascot mood="happy" size="md" showSpeechBubble={false} />
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-300/40 px-4 py-1 text-caption font-black text-amber-300 uppercase tracking-widest"
        >
          <Trophy className="size-4" />
          <span>¡Misión Cumplida!</span>
        </motion.div>

        <h2 className="mt-3 text-display-sm font-black tracking-tight text-white drop-shadow-md">
          ¡FELICIDADES!
        </h2>
        <p className="mt-1 text-title-sm font-extrabold text-blue-200">
          {levelTitle}
        </p>

        <p className="mt-3 text-body-sm font-medium text-blue-100/90 leading-relaxed">
          ¡Bertho está súper orgulloso de tu avance! Has completado todas las preguntas con éxito.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-amber-400 py-3.5 px-6 font-black text-slate-950 shadow-glow-gold hover:bg-amber-300 active:scale-95 transition-all text-body"
          >
            ¡Continuar aprendiendo! 🚀
          </button>
        </div>
      </motion.div>
    </div>
  );
}
