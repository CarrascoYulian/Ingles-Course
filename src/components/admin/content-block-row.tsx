'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileAudio,
  FileText,
  GripVertical,
  ListChecks,
  MessageSquare,
  MoreVertical,
  Pencil,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BLOCK_BADGE } from '@/constants/palettes';
import { useBlockThumbnailUrl } from '@/features/content/hooks/use-content-blocks';
import { cn } from '@/lib/utils';
import type { BlockType, Lesson } from '@/types';
import { ReplaceMediaButton, type ReplaceMediaButtonProps } from './replace-media-button';

export interface ContentBlockRowProps {
  block: Lesson;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  /** Sólo se ofrece a quien tenga permiso `content:delete` (ver `rbac.ts`) — no todo el que puede editar puede borrar. */
  onDelete?: () => void;
  /** Sólo se ofrece cuando el bloque tiene un archivo real que abrir. */
  onOpenFile?: () => void;
  openFilePending?: boolean;
  /** Vista previa inline (PDF/video/audio) sin salir del constructor. */
  onPreview?: () => void;
  /** Sólo si el ítem ya tiene un archivo real: editar título/descripción. */
  onEditLesson?: () => void;
  /** Sólo si el ítem ya tiene un archivo real: ver/borrar sus comentarios. */
  onComments?: () => void;
  /** Sólo si el ítem ya tiene un archivo real: reemplazarlo sin perder comentarios/progreso. */
  onReplace?: Pick<ReplaceMediaButtonProps, 'courseId' | 'moduleId' | 'onReplaced'>;
  /** Selección para acciones en lote — `undefined` oculta el checkbox. */
  selected?: boolean;
  onToggleSelect?: () => void;
}

const TYPE_ICON: Record<BlockType, typeof VideoIcon> = {
  Video: VideoIcon,
  PDF: FileText,
  Audio: FileAudio,
  Ejercicio: ListChecks,
  Evaluación: ClipboardCheck,
};

/**
 * Miniatura real de un bloque de video: el primer frame del archivo, no un
 * ícono. `preload="metadata"` no basta por sí solo en todos los
 * navegadores para pintar un frame — sin reproducir, se fuerza un
 * `currentTime` mínimo apenas cargan los metadatos, que es lo que hace que
 * el navegador decodifique y muestre ese frame como si fuera un póster.
 */
function VideoThumbnail({ url, title }: { url: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  return (
    <>
      <video
        ref={videoRef}
        src={url}
        muted
        playsInline
        preload="metadata"
        aria-label={`Miniatura de “${title}”`}
        className={cn(
          'size-full object-cover transition-opacity duration-200',
          ready ? 'opacity-100' : 'opacity-0',
        )}
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = Math.min(0.5, event.currentTarget.duration || 0);
        }}
        onSeeked={() => setReady(true)}
      />
      {!ready && (
        <span className="absolute inset-0 grid place-items-center bg-surface-sunken">
          <VideoIcon aria-hidden size={22} strokeWidth={1.8} className="text-fg-placeholder" />
        </span>
      )}
    </>
  );
}

/**
 * Fila del constructor de contenido.
 *
 * El reordenado por arrastre (asa `GripVertical`, vía dnd-kit) convive con
 * los botones ↑/↓: el drag-and-drop puro no es operable con teclado, así
 * que los botones — y el propio `useSortable` con sus `KeyboardSensor` —
 * siguen siendo la ruta accesible.
 *
 * La miniatura es más grande que el badge de tipo que tenía antes (44px):
 * en un video se ve el primer frame real, en el resto un ícono grande sobre
 * el color del tipo — más fácil de escanear al mirar una lista larga de
 * bloques que el texto pequeño "Video"/"PDF" de antes.
 */
export function ContentBlockRow({
  block,
  index,
  total,
  onMove,
  onDelete,
  onOpenFile,
  openFilePending,
  onPreview,
  onEditLesson,
  onComments,
  onReplace,
  selected,
  onToggleSelect,
}: ContentBlockRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Icon = TYPE_ICON[block.type];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVideo = block.type === 'Video' && block.mediaKey !== null;
  const { data: thumbnailUrl } = useBlockThumbnailUrl(block.mediaKey, isVideo);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2.5 sm:gap-3.5 md:gap-4 rounded-3xl sm:rounded-4xl md:rounded-5xl border border-line bg-surface p-2.5 sm:p-3.5 md:p-4 transition-colors duration-[160ms] hover:border-fg-placeholder',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={onToggleSelect}
          aria-label={`Seleccionar “${block.title}”`}
          className="size-4 shrink-0 cursor-pointer accent-accent"
        />
      )}

      <span
        aria-hidden={false}
        aria-label={`Arrastrar para reordenar “${block.title}”`}
        {...attributes}
        {...listeners}
        className={cn(
          'hidden w-[18px] shrink-0 text-fg-placeholder md:block',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <GripVertical size={16} />
      </span>

      <div
        className={cn(
          'relative grid size-12 sm:size-16 md:size-20 shrink-0 place-items-center overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl',
          BLOCK_BADGE[block.type],
        )}
      >
        {isVideo && thumbnailUrl ? (
          <VideoThumbnail url={thumbnailUrl} title={block.title} />
        ) : (
          <Icon aria-hidden size={20} strokeWidth={1.8} className="sm:size-[24px] md:size-[26px]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-bold text-fg sm:text-body md:text-body-lg">{block.title}</p>
        <p className="mt-0.5 truncate text-tiny font-semibold text-fg-ghost sm:text-meta">
          Bloque {index + 1} · {block.meta}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {onEditLesson && (
          <Button
            variant="icon"
            size="square"
            onClick={onEditLesson}
            aria-label={`Editar título y descripción de “${block.title}”`}
            title="Editar título y descripción para el alumno"
            className="size-7 sm:size-8 hover:border-brand hover:text-brand"
          >
            <Pencil aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}
        {onPreview && (
          <Button
            variant="icon"
            size="square"
            onClick={onPreview}
            aria-label={`Vista previa de “${block.title}”`}
            title="Ver el archivo tal cual lo ve el alumno"
            className="size-7 sm:size-8 hover:border-brand hover:text-brand"
          >
            <Eye aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}
        {onComments && (
          <Button
            variant="icon"
            size="square"
            onClick={onComments}
            aria-label={`Ver comentarios de “${block.title}”`}
            title="Ver y borrar los comentarios de los alumnos"
            className="hidden size-7 hover:border-brand hover:text-brand sm:inline-flex sm:size-8"
          >
            <MessageSquare aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}
        {onOpenFile && (
          <Button
            variant="icon"
            size="square"
            onClick={onOpenFile}
            disabled={openFilePending}
            aria-label={`Ver archivo de “${block.title}”`}
            title="Verificar que el archivo existe y abrirlo"
            className="hidden size-7 hover:border-brand hover:text-brand disabled:opacity-40 sm:inline-flex sm:size-8"
          >
            <ExternalLink aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}
        {onReplace && (
          <ReplaceMediaButton
            courseId={onReplace.courseId}
            moduleId={onReplace.moduleId}
            title={block.title}
            onReplaced={onReplace.onReplaced}
            className="hidden size-7 sm:inline-flex sm:size-8"
          />
        )}
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={`Subir “${block.title}”`}
          className="size-7 disabled:opacity-40 sm:size-8"
        >
          <ArrowUp aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        <Button
          variant="icon"
          size="square"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={`Bajar “${block.title}”`}
          className="size-7 disabled:opacity-40 sm:size-8"
        >
          <ArrowDown aria-hidden size={13} strokeWidth={2.4} />
        </Button>
        {onDelete && (
          <Button
            variant="icon"
            size="square"
            onClick={onDelete}
            aria-label={`Eliminar “${block.title}”`}
            className="hidden size-7 hover:border-danger-line hover:text-danger-strong sm:inline-flex sm:size-8"
          >
            <X aria-hidden size={13} strokeWidth={2.4} />
          </Button>
        )}

        {/* En móvil (< sm): acciones secundarias en menú desplegable */}
        {(onComments || onOpenFile || onReplace || onDelete) && (
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="icon"
                  size="square"
                  aria-label={`Más acciones para “${block.title}”`}
                  className="size-7"
                >
                  <MoreVertical aria-hidden size={13} strokeWidth={2.4} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onComments && (
                  <DropdownMenuItem onSelect={onComments}>
                    <MessageSquare aria-hidden size={14} className="mr-2 shrink-0" strokeWidth={2} />
                    Comentarios
                  </DropdownMenuItem>
                )}
                {onOpenFile && (
                  <DropdownMenuItem onSelect={onOpenFile} disabled={openFilePending}>
                    <ExternalLink aria-hidden size={14} className="mr-2 shrink-0" strokeWidth={2} />
                    Abrir archivo original
                  </DropdownMenuItem>
                )}
                {onReplace && (
                  <ReplaceMediaButton
                    courseId={onReplace.courseId}
                    moduleId={onReplace.moduleId}
                    title={block.title}
                    onReplaced={onReplace.onReplaced}
                    trigger="menu-item"
                  />
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="danger" onSelect={onDelete}>
                      <X aria-hidden size={14} className="mr-2 shrink-0" strokeWidth={2.4} />
                      Eliminar bloque
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </li>
  );
}
