'use client';

import { toast } from 'sonner';

import { AddBlockPanel } from '@/components/admin/add-block-panel';
import { useAdminHeader } from '@/components/admin/admin-shell';
import { ContentBlockRow } from '@/components/admin/content-block-row';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useCurrentModule } from '@/features/learning/hooks/use-learning';
import {
  useAddBlock,
  useAttachUpload,
  useContentBlocks,
  useMoveBlock,
  useOpenFile,
  useRemoveBlock,
} from '../hooks/use-content-blocks';
import { UploadDropzone } from './upload-dropzone';

export function ContentView() {
  // Antes esto usaba `DEMO_MODULE.id` a secas — un id que sólo existe en el
  // backend de memoria. Con Supabase conectado, el módulo real tiene un
  // UUID distinto, así que hay que resolverlo primero.
  const { data: module, isPending: isModulePending } = useCurrentModule();
  const moduleId = module?.id ?? '';

  const { data: blocks, isPending } = useContentBlocks(moduleId);
  const addBlock = useAddBlock(moduleId);
  const moveBlock = useMoveBlock(moduleId);
  const removeBlock = useRemoveBlock(moduleId);
  const attachUpload = useAttachUpload(moduleId);
  const openFile = useOpenFile();
  const confirmDialog = useConfirmDialog();

  useAdminHeader(
    `${module?.title ?? 'Módulo'} · ${blocks?.length ?? 0} bloques`,
    () => toast(`Módulo guardado · ${blocks?.length ?? 0} bloques publicados`),
  );

  const loadingBlocks = isModulePending || isPending;

  return (
    <div className="grid items-start gap-4 px-5 py-4 lg:grid-cols-[1fr_300px] lg:gap-[18px] lg:px-[30px] lg:py-6">
      <div className="flex flex-col gap-2.5">
        <Card
          radius="md"
          className="hidden items-center justify-between px-[18px] py-3.5 lg:flex"
        >
          <div>
            <h2 className="text-body-lg font-bold text-fg">{module?.title ?? 'Módulo'}</h2>
            <p className="mt-0.5 text-meta font-semibold text-fg-ghost">
              Inglés conversacional · Nivel B1 · requisito: módulo 3 completo
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Vista previa del alumno
          </Button>
        </Card>

        {loadingBlocks && (
          <>
            <LoadingRegion label="Cargando bloques del módulo" />
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[74px] rounded-4xl" />
            ))}
          </>
        )}

        <ol className="flex flex-col gap-2.5">
          {blocks?.map((block, index) => (
            <ContentBlockRow
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              onMove={(direction) => moveBlock.mutate({ blockId: block.id, direction })}
              onDelete={() =>
                confirmDialog.confirm({
                  title: 'Eliminar definitivamente',
                  body: `“${block.title}” se eliminará para todos los estudiantes. Esta acción no se puede deshacer.`,
                  confirmLabel: 'Sí, eliminar',
                  onConfirm: () => removeBlock.mutateAsync({ id: block.id, title: block.title }),
                })
              }
              onOpenFile={block.mediaKey ? () => openFile.mutate(block.mediaKey!) : undefined}
              openFilePending={openFile.isPending}
            />
          ))}
        </ol>

        <UploadDropzone
          moduleId={moduleId}
          onUploaded={(result) =>
            attachUpload.mutateAsync({ moduleId, ...result }).then(() => undefined)
          }
          className="hidden lg:block"
        />

        <div className="lg:hidden">
          <AddBlockPanel onAdd={(type) => addBlock.mutate(type)} pending={addBlock.isPending} />
        </div>
      </div>

      <AddBlockPanel onAdd={(type) => addBlock.mutate(type)} pending={addBlock.isPending} />

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />
    </div>
  );
}
