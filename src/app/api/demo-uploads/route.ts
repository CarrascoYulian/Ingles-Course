import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NextResponse } from 'next/server';

import { guard, isDenied } from '../_lib/guard';
import { IS_DEMO_MODE } from '@/lib/env';

export const runtime = 'nodejs';

/**
 * Subida real para el modo demo.
 *
 * Sin Supabase no hay Storage al que apuntar, pero "verificar que el
 * archivo realmente existe" no puede cumplirse con una subida simulada —
 * por eso esto SÍ escribe bytes a disco (`public/demo-uploads/`), donde
 * Next.js los sirve como archivos estáticos reales y verificables.
 *
 * Con Supabase configurado, `IS_DEMO_MODE` es `false` y esta ruta devuelve
 * 404: la subida real pasa por `/api/uploads` + Supabase Storage.
 */
export async function POST(request: Request) {
  if (!IS_DEMO_MODE) {
    return NextResponse.json({ error: 'Sólo disponible en modo demo' }, { status: 404 });
  }

  const result = await guard('content:edit');
  if (isDenied(result)) return result.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const mediaKey = formData?.get('mediaKey');

  if (!(file instanceof File) || typeof mediaKey !== 'string' || !mediaKey) {
    return NextResponse.json({ error: 'Falta el archivo o la ruta destino' }, { status: 400 });
  }

  // Corta el recorrido de rutas: nunca escribir fuera de public/demo-uploads.
  // Se normaliza a mano con '/' — `path.normalize` de Node usa el separador
  // del sistema operativo (`\` en Windows), y esa ruta se guarda tal cual
  // como `media_key` y se reutiliza luego para servir y localizar el
  // archivo: con backslashes dejaría de coincidir con la convención de
  // rutas (Supabase Storage, URLs) que se usa en todo el resto de la app.
  const safeKey = mediaKey
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.' && segment !== '..')
    .join('/');
  if (!safeKey) {
    return NextResponse.json({ error: 'Ruta de archivo inválida' }, { status: 400 });
  }

  const destination = join(process.cwd(), 'public', 'demo-uploads', ...safeKey.split('/'));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ mediaKey: safeKey });
}
