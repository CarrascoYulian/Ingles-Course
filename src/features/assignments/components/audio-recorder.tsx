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
 * Graba audio con `MediaRecorder`/`getUserMedia` — no existe ningún otro
 * componente de grabación en el repo, así que este es el único punto donde
 * se pide permiso de micrófono. Sólo funciona en HTTPS o `localhost` (API
 * del navegador), probar en `npm run dev` alcanza para desarrollo local.
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

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `entrega-${Date.now()}.webm`, { type: 'audio/webm' });
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
      <p className="text-meta text-danger-strong">
        No se pudo acceder al micrófono — revisá los permisos del navegador para este sitio.
      </p>
    );
  }

  if (state === 'recorded' && previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        <audio src={previewUrl} controls className="w-full" />
        <Button variant="ghost" size="sm" onClick={recordAgain}>
          <RotateCcw className="size-4" />
          Grabar de nuevo
        </Button>
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <Button variant="danger" size="sm" onClick={stopRecording}>
        <Square className="size-4" />
        Detener grabación
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={startRecording}>
      <Mic className="size-4" />
      Grabar audio
    </Button>
  );
}
