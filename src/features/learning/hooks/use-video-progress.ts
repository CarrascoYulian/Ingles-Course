'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useSaveWatchedPercent } from './use-learning';

/** Se usa sólo si la lección todavía no tiene duración real cargada. */
const FALLBACK_LESSON_SECONDS = 8 * 60 + 24;
/** No hay más de un guardado por este intervalo mientras el video corre. */
const SAVE_THROTTLE_MS = 5000;

export interface VideoProgress {
  watched: number;
  playing: boolean;
  canAdvance: boolean;
  /** «03:12 / 08:24» */
  timeLabel: string;
  toggle: () => void;
  /** El `<video>` real llama esto en cada `timeupdate`. */
  onProgress: (percent: number) => void;
  /** El `<video>` real llama esto al terminar de reproducirse. */
  onEnded: () => void;
}

/**
 * Progreso de reproducción de la lección.
 *
 * Antes esto era enteramente simulado: un `setInterval` subía `watched` un
 * 2 % cada 260 ms sin que existiera ningún archivo de video detrás — el
 * alumno "terminaba" una lección mirando una barra de progreso animada, no
 * un video real. Ahora el porcentaje viene del `timeupdate` de un `<video>`
 * de verdad (ver `VideoPlayer`); este hook sólo agrega ese progreso y
 * decide cuándo persistirlo.
 *
 * `lessonId` llega vacío (`''`) mientras `useCurrentModule`/`useModuleLessons`
 * todavía están cargando — antes esto arrancaba siempre en un 38 % fijo,
 * ignorando el `watched_percent` real guardado en `lesson_progress`. Como
 * `useState(initialWatched)` sólo lee su argumento en el primer render, hay
 * que sincronizar explícitamente cuando el id real (y su progreso real)
 * llegan después.
 *
 * `hasVideo` en `false` (lección sin archivo adjunto todavía) no bloquea al
 * alumno: exigir terminar un video que no existe dejaría la lección
 * atascada para siempre, así que `canAdvance` se concede directamente.
 */
export function useVideoProgress(
  lessonId: string,
  initialWatched = 0,
  durationSeconds = FALLBACK_LESSON_SECONDS,
  hasVideo = false,
): VideoProgress {
  const [watched, setWatched] = useState(initialWatched);
  const [playing, setPlaying] = useState(false);
  const save = useSaveWatchedPercent();
  const previousLessonId = useRef(lessonId);
  const lastSavedAt = useRef(0);

  useEffect(() => {
    if (lessonId !== previousLessonId.current && lessonId !== '') {
      previousLessonId.current = lessonId;
      setWatched(initialWatched);
      setPlaying(false);
    }
    // `initialWatched` se omite a propósito: sólo debe reaplicarse cuando
    // CAMBIA la lección, no en cada refetch del mismo `lessonId` (eso
    // pisaría el progreso que el alumno está viendo en vivo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const onProgress = useCallback(
    (percent: number) => {
      setWatched(percent);
      const now = Date.now();
      if (now - lastSavedAt.current >= SAVE_THROTTLE_MS) {
        lastSavedAt.current = now;
        save.mutate({ lessonId, percent });
      }
    },
    [lessonId, save],
  );

  const onEnded = useCallback(() => {
    setWatched(100);
    setPlaying(false);
    lastSavedAt.current = Date.now();
    save.mutate({ lessonId, percent: 100 });
  }, [lessonId, save]);

  const toggle = useCallback(() => {
    if (!hasVideo) return;
    if (playing) {
      setPlaying(false);
      save.mutate({ lessonId, percent: watched });
      return;
    }
    if (watched >= 100) {
      toast('Lección vista al 100 %. Continúa a la siguiente.');
      return;
    }
    setPlaying(true);
  }, [hasVideo, playing, watched, lessonId, save]);

  const elapsed = Math.round((durationSeconds * watched) / 100);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  const totalMinutes = String(Math.floor(durationSeconds / 60)).padStart(2, '0');
  const totalSeconds = String(durationSeconds % 60).padStart(2, '0');

  return {
    watched,
    playing,
    canAdvance: !hasVideo || watched >= 100,
    timeLabel: `${minutes}:${seconds} / ${totalMinutes}:${totalSeconds}`,
    toggle,
    onProgress,
    onEnded,
  };
}
