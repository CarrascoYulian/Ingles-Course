'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  /** Etiqueta de contexto: «Lección 5 de 9 · Módulo 4». */
  contextLabel: string;
  contextLabelShort: string;
  watched: number;
  playing: boolean;
  timeLabel: string;
  canAdvance: boolean;
  onToggle: () => void;
  onPrevious?: () => void;
  onNext: () => void;
  /** URL firmada de Supabase Storage. Si falta, no hay nada que reproducir. */
  src?: string | null;
  poster?: string | null;
  /** `timeupdate` real del `<video>`, ya convertido a 0-100. */
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  /** Posiciones (0-100) de las notas del alumno — señaladas sobre la barra. */
  markers?: number[];
  /** Cambia (incluso al mismo valor, con `nonce`) para saltar el video a ese segundo. */
  seekRequest?: { seconds: number; nonce: number } | null;
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
 * El botón central no anima su cambio de estado: play/pausa se pulsa
 * decenas de veces por sesión y cualquier transición ahí se percibe como
 * retardo. La barra de progreso sí se anima (300 ms) porque comunica avance.
 */
export function VideoPlayer({
  contextLabel,
  contextLabelShort,
  watched,
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(src);

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

  const playLabel = !hasVideo ? 'NO DISPONIBLE' : playing ? 'PAUSA' : watched >= 100 ? 'VISTO' : 'VER';

  return (
    <section
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
              if (el.duration > 0) onProgress?.(Math.round((el.currentTime / el.duration) * 100));
            }}
            onEnded={() => onEnded?.()}
          />
        )}

        {!hasVideo && (
          <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-tiny font-bold text-ink-fg-faint md:text-meta">
            Video no disponible todavía
          </p>
        )}

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
          <span className="text-meta font-extrabold tracking-badge text-white md:text-body">
            {playLabel}
          </span>
        </button>

        <p className="absolute left-3.5 top-3 rounded-sm bg-ink/60 px-2.5 py-[5px] text-caption font-bold text-ink-fg-strong md:left-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
          <span className="md:hidden">{contextLabelShort}</span>
          <span className="hidden md:inline">{contextLabel}</span>
        </p>

        <p className="absolute right-3.5 top-3 rounded-sm bg-ink/60 px-2.5 py-[5px] text-caption font-bold text-ink-accent md:right-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
          {watched} %<span className="hidden md:inline"> visto</span>
        </p>
      </div>

      <div className="px-4 pb-3.5 pt-2.5 md:px-5 md:pb-[18px] md:pt-3.5">
        <div className="relative">
          <Progress
            value={watched}
            tone="accent"
            height={5}
            onInk
            label="Progreso de la lección"
          />
          {markers.map((position, index) => (
            <span
              key={index}
              aria-hidden
              className="pointer-events-none absolute top-1/2 size-[7px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-warning ring-1 ring-ink"
              style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
            />
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 md:mt-3">
          <div className="flex items-center gap-4 text-tiny font-bold text-ink-fg md:text-meta">
            <span>{timeLabel}</span>
            <span className="hidden text-ink-fg-faint md:inline">Velocidad 1×</span>
            <span className="hidden text-ink-fg-faint lg:inline">Subtítulos ES / EN</span>
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
