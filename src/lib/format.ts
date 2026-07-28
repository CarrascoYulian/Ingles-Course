/**
 * Formateadores localizados a es-DO (separador de millares `.`, decimal `,`),
 * tal y como aparece en el diseño: «4.128», «+12,4 %», «1.240 XP».
 */

const LOCALE = 'es-DO';

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

/** «62 %» — con espacio fino antes del signo, como el diseño original. */
export function formatPercent(value: number, decimals = 0): string {
  const formatted = decimals > 0 ? decimalFormatter.format(value) : integerFormatter.format(value);
  return `${formatted} %`;
}

/** «+12,4 %» / «-3,1 %» — siempre con signo explícito. */
export function formatDelta(value: number, unit: '%' | 'pts' | '' = '%'): string {
  const sign = value > 0 ? '+' : '';
  const formatted = Number.isInteger(value)
    ? integerFormatter.format(value)
    : decimalFormatter.format(value);
  return unit ? `${sign}${formatted} ${unit}` : `${sign}${formatted}`;
}

/** Segundos → «03:12». */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** «14 min» a partir de minutos. */
export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** «Sofía Domínguez» → «SD». Máximo dos iniciales. */
export function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Bytes → «4,2 MB». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = value >= 100 ? integerFormatter.format(value) : decimalFormatter.format(value);
  return `${formatted} ${units[unitIndex]}`;
}
