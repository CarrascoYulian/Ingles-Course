'use client';

import { FileAudio, FileText, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BLOCK_TYPES, type BlockType } from '@/types';

/**
 * Video, PDF y Audio ya NO crean un bloque vacío al hacer clic — antes
 * "+ Video" insertaba una fila "Pendiente de subir" separada de la subida
 * real del archivo, y las dos vías escribían la posición del bloque por su
 * cuenta (con `count()`, ver `nextBlockPosition` en el backend), lo que
 * producía bloques duplicados y, si uno se borraba, un choque real contra
 * la restricción única de posición al subir el siguiente archivo. Ahora
 * sólo existen como referencia de qué se puede subir — el único camino
 * para añadirlos es arrastrar o elegir el archivo en la zona de abajo.
 */
const FILE_TYPES: Array<{ type: BlockType; label: string; icon: typeof Video }> = [
  { type: 'Video', label: 'Video', icon: Video },
  { type: 'PDF', label: 'PDF o documento', icon: FileText },
  { type: 'Audio', label: 'Audio de listening', icon: FileAudio },
];

const LABELS: Record<BlockType, string> = {
  Video: 'Video',
  PDF: 'PDF o documento',
  Audio: 'Audio de listening',
  Ejercicio: '+ Ejercicio interactivo',
  Evaluación: '+ Evaluación del módulo',
};

const SHORT_LABELS: Record<BlockType, string> = {
  Video: 'Video',
  PDF: 'PDF',
  Audio: 'Audio',
  Ejercicio: '+ Ejercicio',
  Evaluación: '+ Evaluación',
};

/** Los únicos tipos que siguen creándose con un clic — no son archivos. */
const CREATABLE: BlockType[] = ['Ejercicio', 'Evaluación'];

export function AddBlockPanel({
  onAdd,
  pending,
}: {
  onAdd: (type: BlockType) => void;
  pending?: boolean;
}) {
  return (
    <>
      {/* Escritorio: raíl lateral con nota explicativa. */}
      <Card className="hidden flex-col gap-[9px] lg:flex">
        <h2 className="text-body font-bold text-fg">Añadir bloque</h2>

        <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-[13px]">
          <p className="text-meta font-bold text-fg-subtle">Archivos: sube directo abajo</p>
          {FILE_TYPES.map(({ type, label, icon: Icon }) => (
            <span key={type} className="flex items-center gap-2 text-meta font-semibold text-fg-soft">
              <Icon aria-hidden size={13} strokeWidth={2} />
              {label}
            </span>
          ))}
        </div>

        {CREATABLE.map((type) => (
          <Button
            key={type}
            variant="dashed"
            size="xs"
            onClick={() => onAdd(type)}
            disabled={pending}
            className="justify-start rounded-xl px-[13px] py-[9px]"
          >
            {LABELS[type]}
          </Button>
        ))}
        <p className="mt-1.5 rounded-2xl bg-surface-muted p-[13px] text-meta font-semibold leading-normal text-fg-soft">
          Los bloques se muestran al alumno en este orden. La evaluación siempre debe ir al final
          para cerrar el módulo.
        </p>
      </Card>

      {/* Móvil: fila envolvente bajo la lista. */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {CREATABLE.map((type) => (
          <Button
            key={type}
            variant="dashed"
            size="xs"
            onClick={() => onAdd(type)}
            disabled={pending}
            className="rounded-xl px-[13px] py-[9px]"
          >
            {SHORT_LABELS[type]}
          </Button>
        ))}
      </div>
    </>
  );
}

export { BLOCK_TYPES };
