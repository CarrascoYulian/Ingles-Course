'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSaveWatchedPercent } from './use-learning';
import { canAdvanceLesson, computeElapsedSeconds, formatTimeLabel } from '../video-progress-math';

/** Se usa sólo si la lección todavía no tiene duración real cargada. */
const FALLBACK_LESSON_SECONDS = 8 * 60 + 24;
/** No hay más de un guardado por este intervalo mientras el video corre. */
const SAVE_THROTTLE_MS = 5000;

export interface VideoProgress {
  watched: number;
  /** El punto más lejano que el alumno alcanzó viendo — nunca baja, aunque
   * `watched` sí lo hace al retroceder. Es lo que de verdad debe desbloquear
   * la siguiente lección y limitar hasta dónde se puede saltar hacia
   * adelante (retroceder es libre; adelantar no debe superar esto). */
  maxWatched: number;
  playing: boolean;
  canAdvance: boolean;
  /** «03:12 / 08:24» */
  timeLabel: string;
  /** Segundo actual de reproducción — para marcar notas en el momento real. */
  elapsedSeconds: number;
  durationSeconds: number;
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
  const [maxWatched, setMaxWatched] = useState(initialWatched);
  const [playing, setPlaying] = useState(false);
  const save = useSaveWatchedPercent();
  const previousLessonId = useRef(lessonId);
  const lastSavedAt = useRef(0);
  // Fuente de verdad síncrona de `maxWatched`: el `state` no se actualiza a
  // tiempo dentro del mismo `onProgress` para calcular qué guardar sin
  // arriesgar persistir un valor que retrocedió.
  const maxWatchedRef = useRef(initialWatched);

  useEffect(() => {
    if (lessonId !== previousLessonId.current && lessonId !== '') {
      previousLessonId.current = lessonId;
      setWatched(initialWatched);
      setMaxWatched(initialWatched);
      maxWatchedRef.current = initialWatched;
      setPlaying(false);
    }
    // `initialWatched` se omite a propósito: sólo debe reaplicarse cuando
    // CAMBIA la lección, no en cada refetch del mismo `lessonId` (eso
    // pisaría el progreso que el alumno está viendo en vivo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const onProgress = useCallback(
    (percent: number) => {
      // `watched` sigue el cabezal de reproducción tal cual (baja si el
      // alumno retrocede) — así se calculan `timeLabel`/`elapsedSeconds`.
      // `maxWatched` es el punto más lejano alcanzado y nunca baja: es lo
      // que de verdad desbloquea la siguiente lección y lo que se guarda,
      // para que retroceder a repasar no le "quite" progreso ya hecho.
      setWatched(percent);
      const nextMax = Math.max(maxWatchedRef.current, percent);
      maxWatchedRef.current = nextMax;
      setMaxWatched(nextMax);

      const now = Date.now();
      if (now - lastSavedAt.current >= SAVE_THROTTLE_MS) {
        lastSavedAt.current = now;
        save.mutate({ lessonId, percent: nextMax });
      }
    },
    [lessonId, save],
  );

  // Antes, salir de la lección (cambiar de ruta, avanzar a la siguiente)
  // mientras el video seguía reproduciéndose no guardaba nada: `toggle()`
  // sólo persiste al pausar, y el guardado por `timeupdate` está limitado a
  // uno cada `SAVE_THROTTLE_MS`. El cleanup de este efecto corre tanto al
  // desmontar como justo antes de que cambie `lessonId` — cierra sobre el
  // `lessonId` de ESTE render (no el ref, que ya se actualizó para cuando
  // el cleanup corre), así guarda el avance de la lección que se está
  // dejando, no la nueva.
  //
  // `hasVideo` en `false` corta esto por completo: para un PDF/Audio,
  // `maxWatchedRef` nunca se actualiza (no hay `onProgress`/`onEnded` de un
  // `<video>` real que lo mueva) y se queda clavado en `initialWatched`. Sin
  // este corte, salir de la lección después de marcarla vista (acción
  // explícita del alumno, ver `goToNext` en `CourseView`) pisaba ese 100 %
  // recién guardado con el 0 % inicial — el certificado se abría y volvía a
  // cerrar solo porque el propio desmontaje deshacía el progreso.
  useEffect(() => {
    return () => {
      if (!lessonId || !hasVideo) return;
      save.mutate({ lessonId, percent: maxWatchedRef.current });
    };
    // `save` se omite a propósito: su identidad cambia en cada render y
    // reinscribirla dispararía este cleanup de más.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, hasVideo]);

  const onEnded = useCallback(() => {
    setWatched(100);
    maxWatchedRef.current = 100;
    setMaxWatched(100);
    setPlaying(false);
    lastSavedAt.current = Date.now();
    save.mutate({ lessonId, percent: 100 });
  }, [lessonId, save]);

  // Antes, con `watched >= 100`, esto sólo mostraba un toast y nunca ponía
  // `playing` en `true` — una lección ya vista quedaba imposible de
  // reproducir de nuevo, con el botón mostrando "VISTO" sin reaccionar a
  // los clics. Ver una lección terminada de nuevo es un caso de uso real
  // (repasar antes de un examen); `VideoPlayer` reinicia el `<video>` al
  // segundo 0 cuando detecta que ya había terminado.
  const toggle = useCallback(() => {
    if (!hasVideo) return;
    if (playing) {
      setPlaying(false);
      save.mutate({ lessonId, percent: maxWatchedRef.current });
      return;
    }
    setPlaying(true);
  }, [hasVideo, playing, lessonId, save]);

  const elapsed = computeElapsedSeconds(watched, durationSeconds);

  return {
    watched,
    maxWatched,
    playing,
    canAdvance: canAdvanceLesson(hasVideo, maxWatched),
    timeLabel: formatTimeLabel(elapsed, durationSeconds),
    elapsedSeconds: elapsed,
    durationSeconds,
    toggle,
    onProgress,
    onEnded,
  };
}
