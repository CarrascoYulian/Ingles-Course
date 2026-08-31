import 'server-only';

import { NextResponse } from 'next/server';

import { badRequest, guard, isDenied } from '../_lib/guard';

export const runtime = 'nodejs';

// `msedge-tts` habla WebSocket vía `ws`, que intenta usar el addon nativo
// opcional `bufferutil` si `require('bufferutil')` resuelve a algo — incluso
// un build roto/incompatible de otro proyecto que Node encuentre subiendo
// directorios (este repo vive bajo una carpeta de usuario con su propio
// `package-lock.json`, ver el warning de "workspace root" de Next). Cuando
// eso pasa, `bufferUtil.mask` no es la función que `ws` espera y el
// WebSocket revienta con `TypeError: bufferUtil.mask is not a function`.
// Forzamos la implementación pura en JS de `ws` (siempre correcta, sólo
// más lenta para payloads enormes — acá son frases cortas) importando
// dinámicamente después de fijar la variable, que `ws` sólo lee una vez al
// cargar `buffer-util.js`.
process.env.WS_NO_BUFFER_UTIL = '1';

/**
 * Voz neural de Microsoft Edge (Read Aloud), gratis y sin límite de
 * caracteres — reemplaza la Web Speech API del navegador (`speakEnglish`),
 * que sonaba robótica y dependía de qué voces tuviera instaladas el SO de
 * cada alumno. `en-US-AvaNeural` es una de las voces más naturales del
 * catálogo, pensada para lectura conversacional.
 */
const VOICE = 'en-US-AvaNeural';

/**
 * Lee en voz alta la frase de una pregunta del juego de práctica — texto
 * corto y fijo (nunca contenido libre del alumno), por eso el límite de
 * caracteres es generoso pero no ilimitado.
 */
export async function POST(request: Request) {
  const result = await guard('practice:play');
  if (isDenied(result)) return result.response;

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 500) return badRequest('Texto inválido');

  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk as Buffer);
    }

    return new NextResponse(new Uint8Array(Buffer.concat(chunks)), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el audio' }, { status: 502 });
  }
}
