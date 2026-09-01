'use client';

import { Mic, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export interface AudioRecorderProps {
  /** Entrega un `File` real (Blob + nombre), listo para pasar a `uploadFile()`. */
  onRecorded: (file: File) => void;
}

type RecorderState = 'idle' | 'recording' | 'recorded' | 'denied';

/**
 * Orden de preferencia de formatos: Chrome/Android soportan `audio/webm`,
 * pero Safari/iOS no lo soporta y graba `audio/mp4` (AAC) por defecto — si
 * se le pide `audio/webm` a un `MediaRecorder` que no lo soporta, el
 * constructor tira. Hay que sondear con `isTypeSupported` y usar lo que el
 * navegador realmente puede grabar, nunca asumir un formato fijo.
 */
const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
}

/**
 * Graba audio con `MediaRecorder`/`getUserMedia` — no existe ningún otro
 * componente de grabación en el repo, así que este es el único punto donde
 * se pide permiso de micrófono. Sólo funciona en HTTPS o `localhost` (API
 * del navegador), probar en `npm run dev` alcanza para desarrollo local.
 *
 * El `Blob`/`File` resultante SIEMPRE se etiqueta con el mimeType real que
 * `MediaRecorder` terminó usando (nunca uno hardcodeado): antes se forzaba
 * `audio/webm` sin importar el formato real, y en iPhone/Safari eso subía
 * un archivo MP4/AAC declarado como WebM — el navegador confiaba en la
 * etiqueta al reproducirlo y fallaba al decodificar.
 */
export function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredMimeType = pickSupportedMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = (recorder.mimeType || preferredMimeType || 'audio/webm').split(';')[0] ?? 'audio/webm';
        const extension = extensionForMimeType(mimeType);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `entrega-${Date.now()}.${extension}`, { type: mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
        onRecorded(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
    } catch {
      setState('denied');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setState('recorded');
  }

  function recordAgain() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setState('idle');
  }

  if (state === 'denied') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-center">
        <p className="text-caption font-bold text-rose-700">
          No se pudo acceder al micrófono. Por favor habilita los permisos de audio en tu navegador.
        </p>
      </div>
    );
  }

  if (state === 'recorded' && previewUrl) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-caption font-extrabold text-slate-700">Grabación lista para enviar:</p>
        <audio src={previewUrl} controls className="w-full h-10 rounded-lg" />
        <Button variant="ghost" size="sm" onClick={recordAgain} className="w-fit font-extrabold text-slate-700">
          <RotateCcw className="size-3.5 text-slate-500" />
          Grabar nuevamente
        </Button>
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-center animate-pulse">
        {/* Visualizador de ondas animadas en vivo */}
        <div className="flex items-center gap-1.5 h-8">
          <span className="w-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms] h-6" />
          <span className="w-1.5 bg-rose-600 rounded-full animate-bounce [animation-delay:150ms] h-8" />
          <span className="w-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms] h-5" />
          <span className="w-1.5 bg-rose-600 rounded-full animate-bounce [animation-delay:450ms] h-7" />
          <span className="w-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:200ms] h-4" />
        </div>
        <p className="text-caption font-black text-rose-700 uppercase tracking-wider">
          Grabando audio de tu pronunciación…
        </p>
        <Button variant="danger" size="md" onClick={stopRecording} className="gap-2 font-extrabold shadow-sm">
          <Square className="size-4 fill-white" />
          Finalizar y guardar grabación
        </Button>
      </div>
    );
  }

  return (
    <Button variant="glass" size="md" onClick={startRecording} className="gap-2 font-extrabold text-brand border-brand/30 hover:bg-blue-50">
      <Mic className="size-4.5 text-brand" />
      Iniciar grabación de audio
    </Button>
  );
}
