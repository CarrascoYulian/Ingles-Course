'use client';

import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SquareBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FILES = [
  { type: 'PDF', title: 'Guía de tiempos perfectos', size: '820 KB' },
  { type: 'MP3', title: 'Listening · At the market', size: '4,2 MB' },
  { type: 'DOC', title: 'Hoja de ejercicios 4.5', size: '210 KB' },
] as const;

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

const OBJECTIVES = ['Objetivo: usar “have + participio”', 'Duración 14 min', 'Nivel B1'];

/** Paneles de la lección: descripción, archivos, notas y comentarios. */
export function LessonTabs() {
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
          En esta lección comparamos el Present Perfect con el Past Simple a partir de situaciones
          reales: contar una anécdota, hablar de experiencias y describir lo que acabas de hacer. Al
          final resolverás 6 ejercicios de refuerzo.
        </p>
        <ul className="flex flex-wrap gap-2.5">
          {OBJECTIVES.map((item) => (
            <li
              key={item}
              className="rounded-md bg-surface-sunken px-3 py-[7px] text-meta font-bold text-fg-subtle"
            >
              {item}
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="files">
        <ul className="flex flex-col gap-[9px]">
          {FILES.map((file) => (
            <li
              key={file.title}
              className="flex items-center gap-3 rounded-3xl border border-line px-3.5 py-[13px]"
            >
              <SquareBadge size={38} className="bg-surface-sunken text-fg-subtle">
                {file.type}
              </SquareBadge>
              <span className="min-w-0 flex-1 truncate text-body-sm font-bold text-fg">
                {file.title}
              </span>
              <span className="hidden text-tiny font-semibold text-fg-ghost sm:inline">
                {file.size}
              </span>
              <Button
                variant="quiet"
                size="xs"
                onClick={() => toast(`Descargando ${file.title}…`)}
                className="text-brand hover:bg-brand-soft"
              >
                Descargar
              </Button>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="notes">
        <div className="rounded-4xl border-[1.5px] border-dashed border-line-dashed bg-surface-subtle px-[18px] py-4">
          <p className="text-body font-bold text-fg">Aún no tienes notas en esta lección</p>
          <p className="mt-1 text-body-sm font-medium text-fg-faint">
            Presiona N mientras ves el video para guardar una nota con la marca de tiempo exacta.
          </p>
          <Button
            size="sm"
            onClick={() => toast('Nota creada en 03:12')}
            className="mt-3 rounded-lg px-[15px] py-[9px] text-label"
          >
            Añadir nota
          </Button>
        </div>
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
