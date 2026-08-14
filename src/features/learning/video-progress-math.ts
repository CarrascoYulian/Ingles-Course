/**
 * Cálculos puros del progreso de video, separados de `use-video-progress.ts`
 * (que sí depende de React y de la mutación de guardado) para poder
 * probarlos sin renderizar nada — ver `video-progress-math.test.ts`.
 */

/** Segundo actual de reproducción a partir del porcentaje visto. */
export function computeElapsedSeconds(watchedPercent: number, durationSeconds: number): number {
  return Math.round((durationSeconds * watchedPercent) / 100);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** «03:12 / 08:24» */
export function formatTimeLabel(elapsedSeconds: number, durationSeconds: number): string {
  const minutes = pad(Math.floor(elapsedSeconds / 60));
  const seconds = pad(elapsedSeconds % 60);
  const totalMinutes = pad(Math.floor(durationSeconds / 60));
  const totalSeconds = pad(durationSeconds % 60);
  return `${minutes}:${seconds} / ${totalMinutes}:${totalSeconds}`;
}

/**
 * Una lección sin video adjunto nunca bloquea el avance del alumno — exigir
 * terminar un archivo que no existe la dejaría atascada para siempre.
 */
export function canAdvanceLesson(hasVideo: boolean, watchedPercent: number): boolean {
  return !hasVideo || watchedPercent >= 100;
}
