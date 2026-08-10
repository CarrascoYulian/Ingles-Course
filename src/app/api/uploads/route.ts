import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../_lib/guard';
import { createUploadTicket } from '@/lib/storage';

export const runtime = 'nodejs';

const requestSchema = z.object({
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
});

/** Tipos permitidos. Lista blanca: nunca confiar en el `accept` del input. */
const ALLOWED_PREFIXES = ['video/', 'audio/', 'image/'];
const ALLOWED_EXACT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Firma una URL de subida directa a Supabase Storage.
 *
 * El binario nunca pasa por este servidor: sólo se emite el permiso. Así no
 * hay límite de tamaño de body, ni memoria retenida, ni coste de salida.
 */
export async function POST(request: Request) {
  const result = await guard('content:edit');
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Petición de subida inválida');

  const { courseId, moduleId, fileName, contentType } = parsed.data;

  const allowed =
    ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix)) ||
    ALLOWED_EXACT.includes(contentType);
  if (!allowed) return badRequest(`Tipo de archivo no permitido: ${contentType}`);

  const ticket = await createUploadTicket({ courseId, moduleId, fileName });

  if (!ticket) {
    return NextResponse.json(
      { error: 'El almacenamiento de archivos no está configurado' },
      { status: 503 },
    );
  }

  return NextResponse.json(ticket);
}
