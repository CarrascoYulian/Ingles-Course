'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BLOCK_TYPES, type BlockType } from '@/types';

const LABELS: Record<BlockType, string> = {
  Video: '+ Video',
  PDF: '+ PDF o documento',
  Audio: '+ Audio de listening',
  Ejercicio: '+ Ejercicio interactivo',
  Evaluación: '+ Evaluación del módulo',
};

const SHORT_LABELS: Record<BlockType, string> = {
  Video: '+ Video',
  PDF: '+ PDF',
  Audio: '+ Audio',
  Ejercicio: '+ Ejercicio',
  Evaluación: '+ Evaluación',
};

/** Orden del diseño: vídeo, documento, audio, ejercicio, evaluación. */
const ORDER: BlockType[] = ['Video', 'PDF', 'Audio', 'Ejercicio', 'Evaluación'];

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
        {ORDER.map((type) => (
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
        {ORDER.filter((type) => type !== 'Evaluación').map((type) => (
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
