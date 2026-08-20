import { NextResponse } from 'next/server';

import { badRequest, guard, isDenied } from '../_lib/guard';
import { getPlaybackUrl, mediaExists } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Devuelve la URL de reproducción/descarga de un objeto de Cloudflare R2.
 *
 * La URL se firma en el servidor y caduca en una hora: nunca se guarda en
 * Postgres (una URL persistida acaba rota o convertida en acceso permanente).
 * R2 no tiene RLS propia como Supabase Storage — la autorización la decide
 * `guard('course:read')` arriba, no una política a nivel de objeto.
 */
export async function GET(request: Request) {
  const result = await guard('course:read');
  if (isDenied(result)) return result.response;

  const mediaKey = new URL(request.url).searchParams.get('key');
  if (!mediaKey) return badRequest('Falta el parámetro «key»');

  // Corta el recorrido de rutas: la clave siempre vive bajo un prefijo conocido.
  if (mediaKey.includes('..') || mediaKey.startsWith('/')) {
    return badRequest('Clave de objeto inválida');
  }

  const [url, exists] = await Promise.all([getPlaybackUrl(mediaKey), mediaExists(mediaKey)]);

  if (!exists || !url) {
    return NextResponse.json({ error: 'Medio no disponible' }, { status: 404 });
  }

  return NextResponse.json(
    { url },
    // Se cachea menos que la vida de la firma para no servir URLs caducadas.
    { headers: { 'Cache-Control': 'private, max-age=1800' } },
  );
}
