'use client';

import { FileAudio, FileText, Video } from 'lucide-react';

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

/**
 * "Ejercicio" y "Evaluación" ya no se crean desde acá: eran bloques vacíos
 * ("Pendiente de subir") sin ninguna forma real de cargarles contenido. La
 * evaluación real de un módulo vive en el botón "+ Evaluación" de la
 * cabecera (`QuizEditorDialog`, vía `useSaveQuizDraft`) — ese sí queda
 * funcional para el alumno.
 */
export function AddBlockPanel() {
  return (
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

      <p className="rounded-2xl bg-surface-muted p-[13px] text-meta font-semibold leading-normal text-fg-soft">
        Los bloques se muestran al alumno en este orden. Para la evaluación de la unidad usa el
        botón “+ Evaluación” de arriba — siempre cierra la unidad, al final.
      </p>
    </Card>
  );
}

export { BLOCK_TYPES };
