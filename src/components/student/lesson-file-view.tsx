'use client';

import { ClipboardCheck, FileAudio, FileText, ListChecks, Video as VideoIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { BlockType } from '@/types';

export interface LessonFileViewProps {
  contextLabel: string;
  contextLabelShort: string;
  type: BlockType;
  title: string;
  fileUrl?: string | null;
  /** La URL firmada todavía se está pidiendo — distinto de "no hay archivo". */
  fileUrlPending?: boolean;
  onPrevious?: () => void;
  onNext: () => void;
}

const TYPE_ICON: Record<BlockType, typeof VideoIcon> = {
  Video: VideoIcon,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: ClipboardCheck,
};

/**
 * Reemplaza al `VideoPlayer` cuando el ítem actual no es video. Un PDF se
 * embebe directamente (fondo blanco, sin necesidad de abrir nada aparte);
 * un audio o ejercicio, sin forma de embeberse igual de simple, muestra el
 * icono + botón sobre el mismo fondo oscuro del reproductor. A diferencia de
 * antes, llegar a la lección YA NO la marca vista sola — eso pasa recién al
 * hacer clic en "Siguiente lección" (ver `goToNext` en `CourseView`), así
 * que esa acción explícita es la que de verdad completa el ítem.
 */
export function LessonFileView({
  contextLabel,
  contextLabelShort,
  type,
  title,
  fileUrl,
  fileUrlPending,
  onPrevious,
  onNext,
}: LessonFileViewProps) {
  const Icon = TYPE_ICON[type];

  if (type === 'PDF') {
    return (
      <section aria-label="Contenido de la lección" className="overflow-hidden bg-surface shadow-player md:rounded-9xl">
        <div className="relative grid aspect-[16/10] place-items-center bg-surface-sunken md:aspect-video">
          <p className="absolute left-3.5 top-3 rounded-md bg-black/40 px-2.5 py-[5px] text-caption font-bold text-white backdrop-blur-[2px] md:left-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
            <span className="md:hidden">{contextLabelShort}</span>
            <span className="hidden md:inline">{contextLabel}</span>
          </p>

          {fileUrl && (
            <iframe
              src={fileUrl}
              title={title}
              className="absolute inset-0 size-full border-0 bg-white"
            />
          )}

          {!fileUrl && (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="grid size-16 place-items-center rounded-full border border-fg-faint/30 bg-surface text-fg-subtle md:size-20">
                <Icon aria-hidden size={30} strokeWidth={1.8} />
              </span>
              <p className="max-w-xs text-body-sm font-semibold text-fg-subtle">
                {fileUrlPending ? 'Cargando el archivo…' : 'Archivo no disponible'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-[9px] px-4 pb-3.5 pt-2.5 md:px-5 md:pb-[18px] md:pt-3.5">
          <Button
            variant="quiet"
            size="sm"
            onClick={onPrevious}
            disabled={!onPrevious}
            className="hidden rounded-lg px-[15px] py-[9px] text-label md:inline-flex"
          >
            Anterior
          </Button>
          <Button size="lg" onClick={onNext} className="max-md:px-4 max-md:py-2 max-md:text-meta">
            Siguiente lección
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Contenido de la lección" className="overflow-hidden bg-ink shadow-player md:rounded-9xl">
      <div className="relative grid aspect-[16/10] place-items-center bg-[radial-gradient(circle_at_50%_42%,#16303C_0%,#0B1620_72%)] md:aspect-video">
        <p className="absolute left-3.5 top-3 rounded-md bg-black/40 px-2.5 py-[5px] text-caption font-bold text-ink-fg-strong backdrop-blur-[2px] md:left-5 md:top-[18px] md:px-[11px] md:py-1.5 md:text-tiny">
          <span className="md:hidden">{contextLabelShort}</span>
          <span className="hidden md:inline">{contextLabel}</span>
        </p>

        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <span className="grid size-16 place-items-center rounded-full border border-white/30 bg-black/35 text-white md:size-20">
            <Icon aria-hidden size={30} strokeWidth={1.8} />
          </span>
          <p className="max-w-xs text-body font-bold text-white md:text-body-lg">{title}</p>
          <Button
            size="lg"
            disabled={!fileUrl}
            onClick={() => fileUrl && window.open(fileUrl, '_blank', 'noopener,noreferrer')}
          >
            {fileUrl ? 'Abrir archivo' : fileUrlPending ? 'Cargando…' : 'Archivo no disponible'}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-[9px] px-4 pb-3.5 pt-2.5 md:px-5 md:pb-[18px] md:pt-3.5">
        <Button
          variant="quiet"
          size="sm"
          onClick={onPrevious}
          disabled={!onPrevious}
          className="hidden rounded-lg bg-ink-raised px-[15px] py-[9px] text-label text-ink-fg hover:bg-ink-elevated hover:text-white md:inline-flex"
        >
          Anterior
        </Button>
        <Button size="lg" onClick={onNext} className="max-md:px-4 max-md:py-2 max-md:text-meta">
          Siguiente lección
        </Button>
      </div>
    </section>
  );
}
