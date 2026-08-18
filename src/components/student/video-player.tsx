'use client';

import { Maximize, Minimize, MessageCircle, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  /** Etiqueta de contexto: «Lección 5 de 9 · Módulo 4». */
  contextLabel: string;
  contextLabelShort: string;
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
  /** URL firmada de Supabase Storage. Si falta, no hay nada que reproducir. */
  src?: string | null;
  poster?: string | null;
  /** `timeupdate` real del `<video>`, ya convertido a 0-100 (sin redondear: redondear aquí es lo que causaba los saltos en la barra). */
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  /** Posiciones (0-100) de las notas del alumno — señaladas sobre la barra. */
  markers?: number[];
  /** Cambia (incluso al mismo valor, con `nonce`) para saltar el video a ese segundo. */
  seekRequest?: { seconds: number; nonce: number } | null;
  /** Hay comentarios de otra persona más nuevos que la última vez que el alumno los vio. */
  hasUnseenComments?: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const SKIP_SECONDS = 10;

function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Reproductor de la lección.
 *
 * Antes renderizaba un `<video>` decorativo — se pintaba en pantalla pero
 * nada lo conectaba con play/pausa ni con el progreso, que en realidad
 * venía de un temporizador simulado (`useVideoProgress`). Ahora el `<video>`
 * es real: `playing` controla `.play()/.pause()` vía `ref`, y su propio
 * `timeupdate`/`ended` es la única fuente de `watched`.
 *
 * Antes `onTimeUpdate` redondeaba a entero antes de subir el valor — con
 * eso, la barra "saltaba" en escalones de 1 % en vez de moverse fluida
 * como en YouTube. Ahora sube el porcentaje real sin redondear; sólo se
 * redondea al mostrarlo como texto.
 */
export function VideoPlayer({
  contextLabel,
  contextLabelShort,
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasVideo = Boolean(src);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Posición (0-100) que el mouse/dedo está tocando en la barra ahora mismo
  // — se usa tanto para el tooltip de tiempo como, mientras se arrastra,
  // para la posición visual del relleno: antes la barra sólo saltaba al
  // soltar el mouse (el `onClick` corría en el `mouseup`), así que
  // arrastrar hacia atrás no mostraba nada hasta soltar.
  const [previewPercent, setPreviewPercent] = useState<number | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      // Al terminar, `currentTime` se queda en el final — sin esto, pedir
      // play de nuevo en un video ya visto no hacía nada visible (ya
      // estaba en el último frame).
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [playing]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !seekRequest) return;
    el.currentTime = seekRequest.seconds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.nonce]);

  // La velocidad se resetea sola si el navegador reemplaza el elemento
  // (cambio de lección) — se reaplica cuando cambia `src`.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [src, speed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === sectionRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      sectionRef.current?.requestFullscreen().catch(() => undefined);
    }
  };

  const toggleMute = () => setMuted((m) => !m);

  // Tope de avance: el segundo que corresponde a `maxWatched`. Retroceder
  // (`deltaSeconds`/click negativo) nunca se limita — sólo adelantar más
  // allá de lo que el alumno ya vio de verdad.
  const maxWatchedSeconds = (el: HTMLVideoElement) => (maxWatched / 100) * el.duration;

  const skip = (deltaSeconds: number) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const target = el.currentTime + deltaSeconds;
    const cap = deltaSeconds > 0 ? Math.min(el.duration, maxWatchedSeconds(el)) : el.duration;
    el.currentTime = Math.min(cap, Math.max(0, target));
  };

  // Convierte una posición horizontal del mouse/dedo en el % (0-100) que le
  // corresponde en la barra, ya recortado al tope de "adelantar" permitido
  // — retroceder (percent menor a `maxWatched`) nunca se limita.
  const percentFromClientX = (clientX: number): number | null => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const targetPercent = Math.min(100, Math.max(0, ratio * 100));
    return Math.min(targetPercent, maxWatched);
  };

  // `commit` mueve el video de verdad; sin `commit` sólo actualiza el
  // tooltip/preview (hover sin arrastrar) sin tocar la reproducción.
  const updatePreview = (clientX: number, commit: boolean) => {
    const el = videoRef.current;
    const percent = percentFromClientX(clientX);
    if (percent === null) return;
    setPreviewPercent(percent);
    if (commit && el?.duration) el.currentTime = (percent / 100) * el.duration;
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!;
    setSpeed(next);
  };

  const playLabel = !hasVideo ? 'NO DISPONIBLE' : playing ? 'PAUSA' : watched >= 100 ? 'VISTO' : 'VER';

  return (
    <section
      ref={sectionRef}
      aria-label="Reproductor de la lección"
      className="overflow-hidden bg-ink shadow-player md:rounded-9xl"
    >
      <div
        className={cn(
          'relative grid place-items-center',
          'aspect-[16/10] md:aspect-video',
          'bg-[radial-gradient(circle_at_50%_42%,#16303C_0%,#0B1620_72%)]',
        )}
      >
        {hasVideo && (
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            src={src!}
            poster={poster ?? undefined}
            preload="metadata"
            playsInline
            onTimeUpdate={(event) => {
              const el = event.currentTarget;
              if (el.duration > 0) onProgress?.((el.currentTime / el.duration) * 100);
            }}
            onEnded={() => onEnded?.()}
          />
        )}

        {!hasVideo && (
          <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-tiny font-bold text-ink-fg-faint md:text-meta">
            Video no disponible todavía
          </p>
        )}

        <div className="flex items-center gap-5 md:gap-7">
          <button
            type="button"
            onClick={() => skip(-SKIP_SECONDS)}
            disabled={!hasVideo}
            aria-label={`Retroceder ${SKIP_SECONDS} segundos`}
            className={cn(
              'grid size-10 place-items-center rounded-full border border-white/30 bg-black/35 text-white',
              'transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
              hasVideo ? 'cursor-pointer hover:bg-black/55 active:scale-[0.94]' : 'cursor-not-allowed opacity-40',
            )}
          >
            <RotateCcw aria-hidden size={18} strokeWidth={2.1} />
          </button>

          <button
            type="button"
            onClick={onToggle}
            disabled={!hasVideo}
            aria-pressed={playing}
            aria-label={playing ? 'Pausar la lección' : 'Reproducir la lección'}
            className={cn(
              'relative grid size-[60px] place-items-center rounded-full md:size-[74px]',
              // Fondo oscuro (no blanco translúcido) + sombra propia: un video
              // real puede tener cualquier color de fondo — incluido blanco,
              // contra el que un botón blanco translúcido se volvía invisible.
              'border border-white/40 bg-black/45 shadow-[0_2px_16px_rgba(0,0,0,0.45)] backdrop-blur-[6px]',
              'transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
              hasVideo
                ? 'cursor-pointer hover:bg-black/60 [@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.96]'
                : 'cursor-not-allowed opacity-60',
            )}
          >
            {!hasVideo ? (
              <span className="text-meta font-extrabold tracking-badge text-white md:text-body">
                {playLabel}
              </span>
            ) : playing ? (
              <Pause aria-hidden size={26} strokeWidth={0} fill="white" className="md:size-8" />
            ) : (
              // El triángulo de "play" se ve visualmente descentrado si se
              // centra por su bounding box — se desplaza un poco a la
              // derecha, como en cualquier reproductor convencional.
              <Play
                aria-hidden
                size={26}
                strokeWidth={0}
                fill="white"
                className="translate-x-[2px] md:size-8 md:translate-x-[3px]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => skip(SKIP_SECONDS)}
            disabled={!hasVideo}
            aria-label={`Adelantar ${SKIP_SECONDS} segundos`}
            className={cn(
              'grid size-10 place-items-center rounded-full border border-white/30 bg-black/35 text-white',
              'transition-[background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
              hasVideo ? 'cursor-pointer hover:bg-black/55 active:scale-[0.94]' : 'cursor-not-allowed opacity-40',
            )}
          >
            <RotateCw aria-hidden size={18} strokeWidth={2.1} />
          </button>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent md:h-24"
        />

        <p className="absolute left-3.5 top-3 rounded-md bg-black/40 px-2.5 py-[5px] text-caption font-bold text-ink-fg-strong backdrop-blur-[2px] md:left-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
          <span className="md:hidden">{contextLabelShort}</span>
          <span className="hidden md:inline">{contextLabel}</span>
        </p>

        {hasUnseenComments && (
          <p className="absolute left-3.5 top-11 flex items-center gap-1.5 rounded-md bg-danger px-2.5 py-[5px] text-caption font-bold text-white md:left-5 md:top-[52px] md:px-[11px] md:py-1.5 md:text-tiny">
            <MessageCircle aria-hidden size={11} strokeWidth={2.4} />
            Comentario nuevo
          </p>
        )}

        <p className="absolute right-3.5 top-3 rounded-md bg-black/40 px-2.5 py-[5px] text-caption font-bold text-ink-accent backdrop-blur-[2px] md:right-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
          {Math.round(maxWatched)} %<span className="hidden md:inline"> visto</span>
        </p>
      </div>

      <div className="px-4 pb-3.5 pt-2.5 md:px-5 md:pb-[18px] md:pt-3.5">
        <div
          ref={barRef}
          role="slider"
          aria-label="Saltar a un punto del video"
          aria-valuenow={Math.round(watched)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={hasVideo ? 0 : -1}
          onPointerDown={(event) => {
            if (!hasVideo) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setScrubbing(true);
            updatePreview(event.clientX, true);
          }}
          onPointerMove={(event) => {
            if (!hasVideo) return;
            // Mientras se arrastra (botón/dedo abajo) cada movimiento mueve
            // el video de verdad, no sólo al soltar — es justo lo que antes
            // faltaba: la barra "caía" recién en el `mouseup`.
            updatePreview(event.clientX, scrubbing);
          }}
          onPointerUp={(event) => {
            if (!hasVideo) return;
            setScrubbing(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => setScrubbing(false)}
          onPointerLeave={() => {
            if (!scrubbing) setPreviewPercent(null);
          }}
          onKeyDown={(event) => {
            if (!hasVideo) return;
            if (event.key === 'ArrowRight') skip(SKIP_SECONDS);
            if (event.key === 'ArrowLeft') skip(-SKIP_SECONDS);
          }}
          className={cn(
            'group relative flex items-center py-2.5',
            hasVideo ? 'cursor-pointer touch-none' : 'cursor-default',
          )}
        >
          {/* Pista + relleno propios (no el <Progress> compartido): éste
              anima `width` con una transición de 300 ms, que arrastrando
              hacía que el relleno fuera a la zaga del mouse en vez de
              seguirlo al instante. */}
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-pill bg-ink-line transition-[height] duration-100',
              scrubbing ? 'h-2' : 'h-[5px] group-hover:h-2',
            )}
          >
            <div
              className="h-full rounded-pill bg-accent"
              style={{
                width: `${scrubbing && previewPercent !== null ? previewPercent : watched}%`,
                transition: scrubbing ? 'none' : 'width 150ms linear',
              }}
            />
          </div>

          {markers.map((position, index) => (
            <span
              key={index}
              aria-hidden
              className="pointer-events-none absolute top-1/2 size-[7px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-warning ring-1 ring-ink"
              style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
            />
          ))}

          {/* «Perilla» del reproductor: escondida en reposo, visible al
              pasar el mouse o mientras se arrastra — como en YouTube. */}
          {hasVideo && (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute top-1/2 size-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_0_3px_rgba(0,0,0,0.4)]',
                'opacity-0 transition-opacity duration-100 group-hover:opacity-100',
                scrubbing && 'opacity-100',
              )}
              style={{ left: `${scrubbing && previewPercent !== null ? previewPercent : watched}%` }}
            />
          )}

          {/* Tooltip con el minuto exacto al que se va a saltar — sólo
              mientras hay un hover/arrastre real sobre la barra, para saber
              "por dónde va" antes de soltar. */}
          {hasVideo && previewPercent !== null && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-full mb-2.5 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-tiny font-bold text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
              style={{ left: `${previewPercent}%` }}
            >
              {formatSeconds((previewPercent / 100) * (videoRef.current?.duration || 0))}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 md:mt-3">
          <div className="flex items-center gap-2.5 text-tiny font-bold text-ink-fg md:gap-4 md:text-meta">
            <button
              type="button"
              onClick={onToggle}
              disabled={!hasVideo}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-ink-fg',
                hasVideo ? 'cursor-pointer hover:bg-ink-raised hover:text-white' : 'cursor-not-allowed opacity-40',
              )}
            >
              {playing ? (
                <Pause aria-hidden size={14} strokeWidth={2.2} />
              ) : (
                <Play aria-hidden size={14} strokeWidth={2.2} />
              )}
            </button>
            <span>{timeLabel}</span>
            <button
              type="button"
              onClick={cycleSpeed}
              disabled={!hasVideo}
              aria-label="Cambiar velocidad de reproducción"
              className={cn(
                'hidden rounded-md px-1.5 py-0.5 text-ink-fg-faint md:inline',
                hasVideo && 'cursor-pointer hover:bg-ink-raised hover:text-white',
              )}
            >
              Velocidad {speed}×
            </button>
            <button
              type="button"
              onClick={toggleMute}
              disabled={!hasVideo}
              aria-label={muted || volume === 0 ? 'Activar sonido' : 'Silenciar'}
              className={cn(
                'hidden size-7 place-items-center rounded-full text-ink-fg md:grid',
                hasVideo ? 'cursor-pointer hover:bg-ink-raised hover:text-white' : 'cursor-not-allowed opacity-40',
              )}
            >
              {muted || volume === 0 ? (
                <VolumeX aria-hidden size={14} strokeWidth={2.2} />
              ) : (
                <Volume2 aria-hidden size={14} strokeWidth={2.2} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              disabled={!hasVideo}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                if (next > 0) setMuted(false);
              }}
              aria-label="Volumen"
              className="hidden w-16 accent-accent lg:inline-block"
            />
            <button
              type="button"
              onClick={toggleFullscreen}
              disabled={!hasVideo}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-ink-fg',
                hasVideo ? 'cursor-pointer hover:bg-ink-raised hover:text-white' : 'cursor-not-allowed opacity-40',
              )}
            >
              {isFullscreen ? (
                <Minimize aria-hidden size={14} strokeWidth={2.2} />
              ) : (
                <Maximize aria-hidden size={14} strokeWidth={2.2} />
              )}
            </button>
          </div>

          <div className="flex shrink-0 gap-[9px]">
            <Button
              variant="quiet"
              size="sm"
              onClick={onPrevious}
              disabled={!onPrevious}
              className="hidden rounded-lg bg-ink-raised px-[15px] py-[9px] text-label text-ink-fg hover:bg-ink-elevated hover:text-white md:inline-flex"
            >
              Anterior
            </Button>
            <Button
              size="lg"
              onClick={onNext}
              disabled={!canAdvance}
              className="max-md:px-4 max-md:py-2 max-md:text-meta"
            >
              {canAdvance ? 'Siguiente lección' : 'Termina el video'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
