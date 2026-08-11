'use client';

import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SquareBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { CourseResource, LessonNote } from '@/types';

const COMMENTS = [
  {
    name: 'María Altagracia',
    color: '#0F5257',
    when: 'hace 2 h',
    body: '¿“I have seen” se usa también para algo de ayer? Me confundo cuando doy la fecha exacta.',
  },
  {
    name: 'Prof. Daniel (docente)',
    color: '#2F6BFF',
    when: 'hace 1 h',
    body: 'Buena pregunta: si mencionas un momento cerrado (“yesterday”, “last week”) usa Past Simple. El Present Perfect no lleva tiempo específico.',
  },
] as const;

function formatTimestamp(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export interface LessonTabsProps {
  description: string | null;
  duration: string;
  level: string;
  /** Recursos reales del curso (course_resources) — antes era una lista fija falsa. */
  files: CourseResource[];
  onOpenFile: (mediaKey: string) => void;
  notes: LessonNote[];
  notesPending?: boolean;
  /** Segundo actual del video — la nota se guarda ahí, no en un valor inventado. */
  currentTimeSeconds: number;
  onAddNote: (body: string) => void;
  addNotePending?: boolean;
  onSeekToNote?: (seconds: number) => void;
}

/** Paneles de la lección: descripción, archivos, notas y comentarios. */
export function LessonTabs({
  description,
  duration,
  level,
  files,
  onOpenFile,
  notes,
  notesPending,
  currentTimeSeconds,
  onAddNote,
  addNotePending,
  onSeekToNote,
}: LessonTabsProps) {
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);

  const submitNote = () => {
    if (!draft.trim()) return;
    onAddNote(draft.trim());
    setDraft('');
    setComposing(false);
  };

  return (
    <Tabs defaultValue="desc">
      <TabsList>
        <TabsTrigger value="desc">Descripción</TabsTrigger>
        <TabsTrigger value="files">Archivos</TabsTrigger>
        <TabsTrigger value="notes">
          <span className="md:hidden">Notas</span>
          <span className="hidden md:inline">Mis notas</span>
        </TabsTrigger>
        <TabsTrigger value="comments">Comentarios</TabsTrigger>
      </TabsList>

      <TabsContent value="desc" className="flex flex-col gap-3.5">
        <p className="text-body-lg font-medium leading-[1.65] text-fg-body">
          {description || 'Tu docente todavía no escribió una descripción para este video.'}
        </p>
        <ul className="flex flex-wrap gap-2.5">
          <li className="rounded-md bg-surface-sunken px-3 py-[7px] text-meta font-bold text-fg-subtle">
            Duración {duration}
          </li>
          <li className="rounded-md bg-surface-sunken px-3 py-[7px] text-meta font-bold text-fg-subtle">
            Nivel {level}
          </li>
        </ul>
      </TabsContent>

      <TabsContent value="files">
        {files.length === 0 && (
          <p className="text-body-sm font-medium text-fg-faint">
            Tu docente todavía no ha subido archivos para este curso.
          </p>
        )}
        <ul className="flex flex-col gap-[9px]">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-3xl border border-line px-3.5 py-[13px]"
            >
              <SquareBadge size={38} className="bg-surface-sunken text-fg-subtle">
                {file.type}
              </SquareBadge>
              <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-fg">
                {file.title}
              </span>
              <span className="hidden text-tiny font-semibold text-fg-ghost sm:inline">
                {file.meta}
              </span>
              <Button
                variant="quiet"
                size="xs"
                onClick={() => file.mediaKey && onOpenFile(file.mediaKey)}
                className="text-brand hover:bg-brand-soft"
              >
                Descargar
              </Button>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="notes">
        {!notesPending && notes.length === 0 && !composing && (
          <div className="rounded-4xl border-[1.5px] border-dashed border-line-dashed bg-surface-subtle px-[18px] py-4">
            <p className="text-body font-bold text-fg">Aún no tienes notas en esta lección</p>
            <p className="mt-1 text-body-sm font-medium text-fg-faint">
              Escribe una nota y se guarda en el minuto exacto del video en el que vas.
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {notes.map((note) => (
              <li key={note.id} className="rounded-3xl border border-line px-3.5 py-[13px]">
                <button
                  type="button"
                  onClick={() => onSeekToNote?.(note.timestampSeconds)}
                  className="text-tiny font-extrabold text-brand hover:underline"
                >
                  {formatTimestamp(note.timestampSeconds)}
                </button>
                <p className="mt-1 text-body-sm font-medium text-fg-body">{note.body}</p>
              </li>
            ))}
          </ul>
        )}

        {composing ? (
          <div className="mt-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Nota en el minuto ${formatTimestamp(currentTimeSeconds)}…`}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={submitNote}
                disabled={!draft.trim() || addNotePending}
                className="rounded-lg px-[15px] py-[9px] text-label"
              >
                {addNotePending ? 'Guardando…' : `Guardar en ${formatTimestamp(currentTimeSeconds)}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setComposing(false);
                  setDraft('');
                }}
                className="rounded-lg px-[15px] py-[9px] text-label"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setComposing(true)}
            className="mt-3 rounded-lg px-[15px] py-[9px] text-label"
          >
            Añadir nota
          </Button>
        )}
      </TabsContent>

      <TabsContent value="comments">
        <ul className="flex flex-col gap-3.5">
          {COMMENTS.map((comment) => (
            <li key={comment.name} className="flex gap-3">
              <Avatar name={comment.name} color={comment.color} size={34} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-body-sm font-bold text-fg">{comment.name}</span>
                  <span className="text-caption font-semibold text-fg-ghost">{comment.when}</span>
                </p>
                <p className="mt-[3px] text-body font-medium leading-[1.55] text-fg-body">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
