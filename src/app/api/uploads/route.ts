import { NextResponse } from 'next/server';
import { z } from 'zod';

import { badRequest, guard, isDenied } from '../_lib/guard';
import { can } from '@/lib/auth/rbac';
import { createUploadTicket } from '@/lib/storage';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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
 * Firma una URL de subida directa a Cloudflare R2.
 *
 * El binario nunca pasa por este servidor: sólo se emite el permiso. Así no
 * hay límite de tamaño de body, ni memoria retenida, ni coste de salida.
 */
export async function POST(request: Request) {
  const result = await guard(['content:edit', 'assignment:submit']);
  if (isDenied(result)) return result.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('Petición de subida inválida');

  const { courseId, moduleId, fileName, contentType } = parsed.data;

  const allowed =
    ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix)) ||
    ALLOWED_EXACT.includes(contentType);
  if (!allowed) return badRequest(`Tipo de archivo no permitido: ${contentType}`);

  // El namespacing por alumno sólo se aplica cuando quien sube es un
  // estudiante entregando una tarea — nunca se confía en un `studentId` del
  // body, siempre es el perfil ya autenticado por `guard()`.
  const isStudentSubmission = !can(result.profile.role, 'content:edit');
  const studentId = isStudentSubmission ? result.profile.id : undefined;

  // El docente ya está autorizado por `content:edit` a subir a cualquier
  // módulo. El alumno NO: sin este chequeo, `courseId`/`moduleId` del body
  // se confiaban ciegamente y un alumno podía obtener un ticket de subida
  // firmado para el módulo de otro curso, aunque no tuviera acceso otorgado.
  if (isStudentSubmission) {
    const client = await getSupabaseServerClient();
    if (client) {
      const { data: access } = await client
        .from('module_access')
        .select('id')
        .eq('student_id', studentId!)
        .eq('module_id', moduleId)
        .maybeSingle();
      if (!access) {
        return NextResponse.json({ error: 'No tenés acceso a esa unidad' }, { status: 403 });
      }
    }
  }

  const ticket = await createUploadTicket({ courseId, moduleId, fileName, contentType, studentId });

  if (!ticket) {
    return NextResponse.json(
      { error: 'El almacenamiento de archivos no está configurado' },
      { status: 503 },
    );
  }

  return NextResponse.json(ticket);
}
