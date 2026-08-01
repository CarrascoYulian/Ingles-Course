'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useInterval } from '@/hooks/use-interval';
import { useSaveWatchedPercent } from './use-learning';

const TICK_MS = 260;
const STEP_PERCENT = 2;
/** Duración de la lección de referencia, en segundos (08:24). */
const LESSON_SECONDS = 8 * 60 + 24;

export interface VideoProgress {
  watched: number;
  playing: boolean;
  canAdvance: boolean;
  /** «03:12 / 08:24» */
  timeLabel: string;
  toggle: () => void;
}

/**
 * Progreso de reproducción de la lección.
 *
 * Encapsula el temporizador que en el prototipo vivía suelto en el
 * componente. Al montar un reproductor real, sólo cambia el origen del
 * porcentaje (`timeupdate` del `<video>`): la interfaz no se entera.
 *
 * `lessonId` llega vacío (`''`) mientras `useCurrentModule`/`useModuleLessons`
 * todavía están cargando — antes esto arrancaba siempre en un 38 % fijo,
 * ignorando el `watched_percent` real guardado en `lesson_progress`. Como
 * `useState(initialWatched)` sólo lee su argumento en el primer render, hay
 * que sincronizar explícitamente cuando el id real (y su progreso real)
 * llegan después.
 */
export function useVideoProgress(lessonId: string, initialWatched = 0): VideoProgress {
  const [watched, setWatched] = useState(initialWatched);
  const [playing, setPlaying] = useState(false);
  const save = useSaveWatchedPercent();
  const previousLessonId = useRef(lessonId);

  useEffect(() => {
    if (lessonId !== previousLessonId.current && lessonId !== '') {
      previousLessonId.current = lessonId;
      setWatched(initialWatched);
    }
    // `initialWatched` se omite a propósito: sólo debe reaplicarse cuando
    // CAMBIA la lección, no en cada refetch del mismo `lessonId` (eso
    // pisaría el progreso que el alumno está viendo en vivo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useInterval(
    () => {
      setWatched((current) => {
        const next = Math.min(100, current + STEP_PERCENT);
        if (next >= 100) {
          setPlaying(false);
          save.mutate({ lessonId, percent: 100 });
        }
        return next;
      });
    },
    playing ? TICK_MS : null,
  );

  const toggle = useCallback(() => {
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
  }, [playing, watched, lessonId, save]);

  const elapsed = Math.round((LESSON_SECONDS * watched) / 100);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return {
    watched,
    playing,
    canAdvance: watched >= 100,
    timeLabel: `${minutes}:${seconds} / 08:24`,
    toggle,
  };
}
