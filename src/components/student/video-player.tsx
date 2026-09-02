'use client';

import {
  Check,
  Maximize,
  MessageCircle,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  /** Etiqueta de contexto: «Lección 5 de 9 · Módulo 4». */
  contextLabel: string;
  contextLabelShort: string;
  lessonTitle?: string;
  nextLessonTitle?: string;
  watched: number;
  /** Punto más lejano alcanzado (0-100) — nunca baja. Limita hasta dónde se
   * puede saltar hacia adelante; retroceder no tiene límite. */
  maxWatched: number;
  playing: boolean;
  timeLabel: string;
  canAdvance: boolean;
  onToggle: () => void;
  onPrevious?: () => void;
  onNext: () => void;
  /** URL firmada de Supabase Storage/R2. Si falta, no hay nada que reproducir. */
  src?: string | null;
  poster?: string | null;
  /** `timeupdate` real del `<video>`, ya convertido a 0-100 sin redondear. */
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  /** Posiciones (0-100) de las notas del alumno — señaladas sobre la barra. */
  markers?: number[];
  /** Cambia para saltar el video a ese segundo. */
  seekRequest?: { seconds: number; nonce: number } | null;
  /** Hay comentarios de otra persona más nuevos. */
  hasUnseenComments?: boolean;
  /** Modo Cine / Teatro. */
  isTheater?: boolean;
  onToggleTheater?: () => void;
  /** Pestaña de subtítulos / transcripción / notas. */
  onOpenTranscript?: () => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SKIP_SECONDS = 10;
const HIDE_CONTROLS_DELAY_MS = 2500;
const COUNTDOWN_SECONDS = 5;

function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer({
  contextLabel,
  contextLabelShort,
  lessonTitle,
  nextLessonTitle,
  watched,
  maxWatched,
  playing,
  timeLabel,
  canAdvance,
  onToggle,
  onPrevious,
  onNext,
  src,
  poster,
  onProgress,
  onEnded,
  markers = [],
  seekRequest,
  hasUnseenComments,
  isTheater = false,
  onToggleTheater,
  onOpenTranscript,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hideControlsTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const hasVideo = Boolean(src);

  // Preferencias persistentes en localStorage
  const [speed, setSpeed] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [autoplay, setAutoplay] = useState(true);

  // Estados visuales e interactivos
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipAvailable, setIsPipAvailable] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewPercent, setPreviewPercent] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [bufferedEndPercent, setBufferedEndPercent] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Feedback de animación en el centro (Play / Pause / Double Tap)
  const [centerAction, setCenterAction] = useState<{ type: 'play' | 'pause' | 'skip-fwd' | 'skip-bwd'; nonce: number } | null>(null);
  const centerActionTimer = useRef<number | null>(null);

  const triggerCenterAction = useCallback((type: 'play' | 'pause' | 'skip-fwd' | 'skip-bwd') => {
    setCenterAction({ type, nonce: Date.now() });
    if (centerActionTimer.current) window.clearTimeout(centerActionTimer.current);
    centerActionTimer.current = window.setTimeout(() => {
      setCenterAction(null);
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (centerActionTimer.current) window.clearTimeout(centerActionTimer.current);
    };
  }, []);

  // Cuenta regresiva de fin de lección (YouTube / Coursera autoplay card)
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);

  // Carga inicial de preferencias
  useEffect(() => {
    try {
      const savedSpeed = localStorage.getItem('player_playback_speed');
      if (savedSpeed) setSpeed(Number(savedSpeed));
      const savedVolume = localStorage.getItem('player_volume');
      if (savedVolume) setVolume(Number(savedVolume));
      const savedMuted = localStorage.getItem('player_muted');
      if (savedMuted) setMuted(savedMuted === 'true');
      const savedAutoplay = localStorage.getItem('player_autoplay');
      if (savedAutoplay !== null) setAutoplay(savedAutoplay === 'true');
    } catch {
      // Ignore localStorage errors
    }

    if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document) {
      setIsPipAvailable(document.pictureInPictureEnabled);
    }
  }, []);

  const handleSpeedChange = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
    try {
      localStorage.setItem('player_playback_speed', String(nextSpeed));
    } catch {}
    setSettingsOpen(false);
  };

  const handleAutoplayToggle = () => {
    setAutoplay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('player_autoplay', String(next));
      } catch {}
      return next;
    });
  };

  const handleVolumeChange = (nextVolume: number) => {
    setVolume(nextVolume);
    setMuted(nextVolume === 0);
    try {
      localStorage.setItem('player_volume', String(nextVolume));
      localStorage.setItem('player_muted', String(nextVolume === 0));
    } catch {}
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem('player_muted', String(next));
      } catch {}
      return next;
    });
  };

  // Auto-ocultado de controles estilo YouTube
  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    if (playing && !settingsOpen && !scrubbing) {
      hideControlsTimer.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, HIDE_CONTROLS_DELAY_MS);
    }
  }, [playing, settingsOpen, scrubbing]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (playing && !settingsOpen && !scrubbing) {
      setControlsVisible(false);
    }
  };

  // Sincronización del elemento `<video>` con el estado playing
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => undefined);
      resetControlsTimeout();
    } else {
      el.pause();
      setControlsVisible(true);
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    }
  }, [playing, resetControlsTimeout]);

  // Manejo de peticiones de salto de tiempo (notas, timestamps)
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !seekRequest) return;
    el.currentTime = seekRequest.seconds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.nonce]);

  // Sincronización de velocidad, volumen y mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [src, speed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Detección de Fullscreen (incluye prefijo -webkit y el fullscreen nativo
  // del <video> en iOS Safari, que no soporta Fullscreen API en otros elementos)
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const onFullscreenChange = () => {
      const fsEl = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setIsFullscreen(fsEl === sectionRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    const video = videoRef.current;
    const onIosBegin = () => setIsFullscreen(true);
    const onIosEnd = () => setIsFullscreen(false);
    video?.addEventListener('webkitbeginfullscreen', onIosBegin);
    video?.addEventListener('webkitendfullscreen', onIosEnd);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      video?.removeEventListener('webkitbeginfullscreen', onIosBegin);
      video?.removeEventListener('webkitendfullscreen', onIosEnd);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const el = sectionRef.current as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;

    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      } else {
        doc.webkitExitFullscreen?.();
      }
      return;
    }

    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => undefined);
    } else if (el?.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (video?.webkitEnterFullscreen) {
      // iOS Safari: solo el <video> soporta pantalla completa, no el contenedor.
      // Muestra los controles nativos de iOS en vez de los nuestros.
      video.webkitEnterFullscreen();
    }
  };

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch {
      // PiP no soportado o bloqueado
    }
  };

  // Tope de avance honesto
  const maxWatchedSeconds = useCallback(
    (el: HTMLVideoElement) => (maxWatched / 100) * (el.duration || videoDuration),
    [maxWatched, videoDuration],
  );

  const skip = useCallback(
    (deltaSeconds: number) => {
      const el = videoRef.current;
      if (!el || !el.duration) return;
      const target = el.currentTime + deltaSeconds;
      const cap = deltaSeconds > 0 ? Math.min(el.duration, maxWatchedSeconds(el)) : el.duration;
      el.currentTime = Math.min(cap, Math.max(0, target));
      triggerCenterAction(deltaSeconds > 0 ? 'skip-fwd' : 'skip-bwd');
      resetControlsTimeout();
    },
    [maxWatchedSeconds, resetControlsTimeout, triggerCenterAction],
  );

  const percentFromClientX = (clientX: number): number | null => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const targetPercent = Math.min(100, Math.max(0, ratio * 100));
    return Math.min(targetPercent, maxWatched);
  };

  const updatePreview = (clientX: number, commit: boolean) => {
    const el = videoRef.current;
    const percent = percentFromClientX(clientX);
    if (percent === null) return;
    setPreviewPercent(percent);
    if (commit && el && el.duration) {
      el.currentTime = (percent / 100) * el.duration;
    }
  };

  // Atajos de teclado completos estilo YouTube
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o dialog
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target && target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          onToggle();
          triggerCenterAction(playing ? 'pause' : 'play');
          break;
        case 'j':
          e.preventDefault();
          skip(-SKIP_SECONDS);
          break;
        case 'l':
          e.preventDefault();
          skip(SKIP_SECONDS);
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          skip(5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.05));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.05));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          if (onToggleTheater) {
            e.preventDefault();
            onToggleTheater();
          }
          break;
        case 'c':
          if (onOpenTranscript) {
            e.preventDefault();
            onOpenTranscript();
          }
          break;
        default:
          // Teclas 0-9 para saltar a porcentajes
          if (e.key >= '0' && e.key <= '9') {
            const digit = Number(e.key);
            const targetPercent = digit * 10;
            const el = videoRef.current;
            if (el && el.duration) {
              const allowedPercent = Math.min(targetPercent, maxWatched);
              el.currentTime = (allowedPercent / 100) * el.duration;
            }
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle, playing, skip, volume, onToggleTheater, onOpenTranscript, maxWatched, triggerCenterAction]);

  // Actualización de buffer cacheado
  const updateBufferProgress = () => {
    const el = videoRef.current;
    if (!el || el.buffered.length === 0 || !el.duration) return;
    try {
      const bufferedEnd = el.buffered.end(el.buffered.length - 1);
      setBufferedEndPercent((bufferedEnd / el.duration) * 100);
    } catch {}
  };

  // Manejo de fin de video con auto-avance (Autoplay countdown)
  const handleEnded = () => {
    if (onEnded) onEnded();
    if (autoplay && canAdvance) {
      setCountdownRemaining(COUNTDOWN_SECONDS);
      if (countdownTimer.current) window.clearInterval(countdownTimer.current);
      countdownTimer.current = window.setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownTimer.current) window.clearInterval(countdownTimer.current);
            onNext();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const cancelCountdown = () => {
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    setCountdownRemaining(null);
  };

  const currentDisplayTime = formatSeconds(currentTime);
  const totalDisplayTime =
    videoDuration > 0
      ? formatSeconds(videoDuration)
      : videoRef.current?.duration
        ? formatSeconds(videoRef.current.duration)
        : timeLabel
          ? timeLabel.split('/')[1]?.trim() ?? '00:00'
          : '00:00';

  return (
    <section
      ref={sectionRef}
      aria-label="Reproductor de video"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative overflow-hidden bg-black text-white select-none',
        isFullscreen ? 'size-full rounded-none' : 'w-full rounded-none sm:rounded-2xl md:rounded-3xl sm:shadow-2xl',
        'aspect-video',
      )}
    >
      {/* Video Element */}
      {hasVideo ? (
        <video
          ref={videoRef}
          src={src!}
          poster={poster ?? undefined}
          preload="metadata"
          playsInline
          onClick={() => {
            onToggle();
            triggerCenterAction(playing ? 'pause' : 'play');
          }}
          onDoubleClick={toggleFullscreen}
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (dur && Number.isFinite(dur)) {
              setVideoDuration(dur);
            }
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setCurrentTime(el.currentTime);
            if (el.duration > 0) {
              onProgress?.((el.currentTime / el.duration) * 100);
            }
            updateBufferProgress();
          }}
          onProgress={updateBufferProgress}
          onEnded={handleEnded}
          className="size-full object-contain cursor-pointer"
        />
      ) : (
        <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_50%_42%,#1a2a36_0%,#081018_85%)] p-6 text-center">
          <p className="text-body font-bold text-white/70 md:text-title-sm">
            Video no disponible todavía
          </p>
        </div>
      )}

      {/* Feedback central de Play/Pause/Skip (desvanece suavemente sin loop) */}
      {centerAction && (
        <div
          key={centerAction.nonce}
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <div className="grid size-20 place-items-center rounded-full bg-black/70 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-75 fill-mode-forwards">
            {centerAction.type === 'play' && <Play size={36} fill="white" className="translate-x-0.5 text-white" />}
            {centerAction.type === 'pause' && <Pause size={36} fill="white" className="text-white" />}
            {centerAction.type === 'skip-fwd' && <RotateCw size={36} className="text-white" />}
            {centerAction.type === 'skip-bwd' && <RotateCcw size={36} className="text-white" />}
          </div>
        </div>
      )}

      {/* Overlay Superior (Contexto, Unidad, Comentarios y % Visto) */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-5',
          'bg-gradient-to-b from-black/80 via-black/30 to-transparent',
          'transition-opacity duration-300',
          controlsVisible || !playing ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-black/50 px-3 py-1 text-tiny font-bold text-white/90 backdrop-blur-md">
            <span className="md:hidden">{contextLabelShort}</span>
            <span className="hidden md:inline">{contextLabel}</span>
          </span>

          {hasUnseenComments && (
            <span className="flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1 text-tiny font-bold text-white shadow-sm">
              <MessageCircle size={12} strokeWidth={2.4} />
              Comentario nuevo
            </span>
          )}
        </div>

        <span className="rounded-lg bg-black/50 px-3 py-1 text-tiny font-extrabold text-brand-light backdrop-blur-md">
          {Math.round(maxWatched)}% visto
        </span>
      </div>

      {/* Card de Fin de Lección / Autoplay Countdown (Coursera & YouTube Style) */}
      {countdownRemaining !== null && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <p className="text-tiny font-extrabold tracking-widest text-brand-light uppercase">
            Siguiente lección
          </p>
          <h3 className="mt-2 max-w-md text-center text-heading-sm font-extrabold text-white text-pretty">
            {nextLessonTitle || 'Siguiente lección'}
          </h3>
          <p className="mt-2 text-meta font-medium text-white/70">
            Iniciando en {countdownRemaining} segundos…
          </p>

          <div className="mt-6 flex items-center gap-4">
            <Button
              variant="outline"
              size="md"
              onClick={cancelCountdown}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              size="md"
              onClick={() => {
                cancelCountdown();
                onNext();
              }}
              className="bg-brand text-brand-fg hover:bg-brand-hover font-bold shadow-lg"
            >
              <Play size={16} fill="currentColor" className="mr-2" />
              Reproducir ahora
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Controles Inferior (Superpuesta con auto-hide) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col justify-end pt-8 pb-3 px-3.5 md:pb-4 md:px-5',
          'bg-gradient-to-t from-black/95 via-black/60 to-transparent',
          'transition-all duration-300',
          controlsVisible || !playing || scrubbing || settingsOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none',
        )}
      >
        {/* Scrubber / Progress Bar (YouTube Standard) */}
        <div
          ref={barRef}
          role="slider"
          aria-label="Progreso del video"
          aria-valuenow={Math.round(watched)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={hasVideo ? 0 : -1}
          onPointerDown={(e) => {
            if (!hasVideo) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrubbing(true);
            updatePreview(e.clientX, true);
          }}
          onPointerMove={(e) => {
            if (!hasVideo) return;
            updatePreview(e.clientX, scrubbing);
          }}
          onPointerUp={(e) => {
            if (!hasVideo) return;
            setScrubbing(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => setScrubbing(false)}
          onPointerLeave={() => {
            if (!scrubbing) setPreviewPercent(null);
          }}
          className={cn(
            'group/scrubber relative flex w-full items-center py-3',
            hasVideo ? 'cursor-pointer touch-none' : 'cursor-default',
          )}
        >
          {/* Pista de fondo */}
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-full bg-white/20 transition-all duration-150',
              scrubbing ? 'h-2' : 'h-1 group-hover/scrubber:h-2',
            )}
          >
            {/* Pista de buffer cacheado */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, bufferedEndPercent))}%` }}
            />

            {/* Pista de progreso reproducido (Rojo YouTube / Brand) */}
            <div
              className="absolute inset-y-0 left-0 bg-brand rounded-full"
              style={{
                width: `${scrubbing && previewPercent !== null ? previewPercent : watched}%`,
                transition: scrubbing ? 'none' : 'width 100ms linear',
              }}
            />
          </div>

          {/* Marcadores de notas del alumno en la barra */}
          {markers.map((pos, i) => (
            <span
              key={i}
              title="Nota marcada aquí"
              className="pointer-events-none absolute top-1/2 size-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-warning ring-2 ring-black shadow-sm"
              style={{ left: `${Math.min(100, Math.max(0, pos))}%` }}
            />
          ))}

          {/* Perilla del Scrubber (Knob) */}
          {hasVideo && (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_8px_rgba(239,68,68,0.8)] ring-2 ring-white',
                'scale-0 transition-transform duration-150 group-hover/scrubber:scale-100',
                scrubbing && 'scale-125',
              )}
              style={{ left: `${scrubbing && previewPercent !== null ? previewPercent : watched}%` }}
            />
          )}

          {/* Tooltip de tiempo al pasar el cursor */}
          {hasVideo && previewPercent !== null && (
            <span
              className="pointer-events-none absolute bottom-full mb-3 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 text-tiny font-bold text-white shadow-xl backdrop-blur-sm border border-white/10"
              style={{ left: `${previewPercent}%` }}
            >
              {formatSeconds((previewPercent / 100) * (videoDuration || (videoRef.current?.duration ?? 0)))}
            </span>
          )}
        </div>

        {/* Fila de Botones y Controles (Orden y Estándar YouTube) */}
        <div className="flex items-center justify-between gap-2 md:gap-3 text-white">
          {/* Controles Izquierda: Prev, Play, Next, Volumen, Timecode */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Lección anterior */}
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              title="Lección anterior (Shift+P)"
              aria-label="Lección anterior"
              className={cn(
                'grid size-8 md:size-9 place-items-center rounded-lg text-white/85 transition-colors',
                onPrevious ? 'hover:bg-white/15 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed',
              )}
            >
              <SkipBack size={18} strokeWidth={2.2} />
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={onToggle}
              disabled={!hasVideo}
              title={playing ? 'Pausar (k / Espacio)' : 'Reproducir (k / Espacio)'}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className={cn(
                'grid size-9 md:size-10 place-items-center rounded-lg text-white transition-colors',
                hasVideo ? 'hover:bg-white/15 cursor-pointer active:scale-95' : 'opacity-40 cursor-not-allowed',
              )}
            >
              {playing ? (
                <Pause size={22} fill="white" strokeWidth={0} />
              ) : (
                <Play size={22} fill="white" strokeWidth={0} className="translate-x-0.5" />
              )}
            </button>

            {/* Lección siguiente */}
            <button
              type="button"
              onClick={onNext}
              disabled={!canAdvance}
              title={canAdvance ? 'Siguiente lección (Shift+N)' : 'Termina el video para avanzar'}
              aria-label="Siguiente lección"
              className={cn(
                'grid size-8 md:size-9 place-items-center rounded-lg text-white/85 transition-colors',
                canAdvance ? 'hover:bg-white/15 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed',
              )}
            >
              <SkipForward size={18} strokeWidth={2.2} />
            </button>

            {/* Grupo de Volumen con Slider Expandible al Hover */}
            <div className="group/vol flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={toggleMute}
                disabled={!hasVideo}
                title={muted || volume === 0 ? 'Activar sonido (m)' : 'Silenciar (m)'}
                aria-label={muted || volume === 0 ? 'Activar sonido' : 'Silenciar'}
                className="grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors"
              >
                {muted || volume === 0 ? (
                  <VolumeX size={19} strokeWidth={2.2} />
                ) : volume < 0.5 ? (
                  <Volume1 size={19} strokeWidth={2.2} />
                ) : (
                  <Volume2 size={19} strokeWidth={2.2} />
                )}
              </button>

              <div className="w-0 overflow-hidden transition-all duration-200 ease-out group-hover/vol:w-20 md:group-hover/vol:w-24 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Volumen"
                  className="h-1 w-20 md:w-24 accent-brand cursor-pointer bg-white/30 rounded-full"
                />
              </div>
            </div>

            {/* Timecode actual / total */}
            <div className="ml-1 text-tiny md:text-meta font-bold tracking-tight text-white/90">
              <span>{currentDisplayTime}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/60">{totalDisplayTime}</span>
            </div>
          </div>

          {/* Título Central (Opcional en desktop) */}
          {lessonTitle && (
            <span className="hidden xl:block max-w-[200px] truncate text-tiny font-semibold text-white/70">
              {lessonTitle}
            </span>
          )}

          {/* Controles Derecha: Autoplay, Subtítulos, Settings, PiP, Teatro, Fullscreen */}
          <div className="flex items-center gap-1 md:gap-1.5 relative">
            {/* Toggle Autoplay (Avance automático) */}
            <button
              type="button"
              onClick={handleAutoplayToggle}
              title={`Avance automático: ${autoplay ? 'Activado' : 'Desactivado'}`}
              aria-label="Avance automático"
              className={cn(
                'relative hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-extrabold transition-colors sm:flex',
                autoplay ? 'bg-brand/30 text-brand-light border border-brand/40' : 'bg-white/10 text-white/60 hover:bg-white/20',
              )}
            >
              <span className="hidden sm:inline">Autoplay</span>
              <span
                className={cn(
                  'size-2 rounded-full transition-all',
                  autoplay ? 'bg-brand shadow-[0_0_6px_rgba(239,68,68,1)]' : 'bg-white/40',
                )}
              />
            </button>

            {/* Subtítulos / Transcripción */}
            {onOpenTranscript && (
              <button
                type="button"
                onClick={onOpenTranscript}
                title="Subtítulos / Transcripción (c)"
                aria-label="Subtítulos o transcripción"
                className="grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors"
              >
                <Subtitles size={18} strokeWidth={2.2} />
              </button>
            )}

            {/* Menú de Configuración (Settings / Velocidad) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((s) => !s)}
                title="Configuración de reproducción"
                aria-label="Configuración"
                className={cn(
                  'grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors',
                  settingsOpen && 'bg-white/20 text-white rotate-45',
                )}
              >
                <Settings size={18} strokeWidth={2.2} className="transition-transform duration-200" />
              </button>

              {/* Popover de Configuración */}
              {settingsOpen && (
                <div
                  className="absolute bottom-full right-0 mb-3 w-48 max-w-[calc(100%-1.5rem)] rounded-xl bg-black/95 p-2 shadow-2xl backdrop-blur-xl border border-white/15 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-2.5 py-1.5 text-caption font-extrabold text-white/40 uppercase tracking-wider">
                    Velocidad
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSpeedChange(s)}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-tiny font-bold transition-colors text-left',
                          speed === s ? 'bg-brand/20 text-brand-light font-extrabold' : 'text-white/80 hover:bg-white/10 hover:text-white',
                        )}
                      >
                        <span>{s === 1 ? 'Normal (1×)' : `${s}×`}</span>
                        {speed === s && <Check size={14} strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Picture in Picture (PiP) */}
            {isPipAvailable && (
              <button
                type="button"
                onClick={togglePiP}
                title="Pantalla flotante (Picture-in-Picture)"
                aria-label="Picture in Picture"
                className="hidden sm:grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors"
              >
                <PictureInPicture2 size={18} strokeWidth={2.2} />
              </button>
            )}

            {/* Modo Cine / Teatro */}
            {onToggleTheater && (
              <button
                type="button"
                onClick={onToggleTheater}
                title={isTheater ? 'Vista estándar (t)' : 'Modo Cine (t)'}
                aria-label={isTheater ? 'Salir de modo cine' : 'Modo cine'}
                className={cn(
                  'hidden md:grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors',
                  isTheater && 'text-brand-light bg-white/10',
                )}
              >
                <span className="border-2 border-current rounded-sm w-4 h-3 inline-block" />
              </button>
            )}

            {/* Pantalla Completa */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa (f)' : 'Pantalla completa (f)'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="grid size-8 md:size-9 place-items-center rounded-lg text-white/85 hover:bg-white/15 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize size={18} strokeWidth={2.2} />
              ) : (
                <Maximize size={18} strokeWidth={2.2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
