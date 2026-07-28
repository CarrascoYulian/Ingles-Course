-- ============================================================================
-- Datos de ejemplo: reproducen el contenido del diseño para poder abrir la
-- app con Supabase conectado y ver exactamente las mismas pantallas.
--
-- Requiere que los usuarios existan ya en auth.users (créalos desde el panel
-- de Supabase o con `supabase auth admin create-user`).
-- ============================================================================

insert into courses (id, name, level, published, position) values
  ('11111111-1111-1111-1111-111111111111', 'Inglés desde cero',        'A1', true,  0),
  ('22222222-2222-2222-2222-222222222222', 'Inglés conversacional',    'B1', true,  1),
  ('33333333-3333-3333-3333-333333333333', 'Inglés para negocios',     'B2', false, 2),
  ('44444444-4444-4444-4444-444444444444', 'Pronunciación intensiva',  'A2', true,  3)
on conflict (id) do nothing;

insert into modules (id, course_id, title, position) values
  ('aaaaaaaa-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-222222222222',
   'Módulo 4 · Tiempos perfectos', 3)
on conflict (id) do nothing;

-- `content_blocks` tiene un UNIQUE (module_id, position) DEFERRABLE — se
-- necesita así para que reordenar bloques (intercambiar posiciones) no
-- viole la restricción a mitad de transacción. Pero un UNIQUE DEFERRABLE no
-- puede ser árbitro de ON CONFLICT, así que aquí se fija un `id` explícito
-- y se hace conflicto sobre él en su lugar.
insert into content_blocks (id, module_id, type, title, meta, position, media_key) values
  ('b0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 'Video',      'Present Perfect vs. Past Simple', '14 min · 1080p',                 0, 'cursos/22222222/modulos/mod-4/present-perfect.mp4'),
  ('b0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 'PDF',        'Guía de tiempos perfectos',       '820 KB',                         1, 'cursos/22222222/modulos/mod-4/guia.pdf'),
  ('b0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 'Ejercicio',  'Completar 12 oraciones',          '10 preguntas',                   2, null),
  ('b0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 'Audio',      'Listening · At the market',       '4,2 MB',                         3, 'cursos/22222222/modulos/mod-4/listening.mp3'),
  ('b0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000004', 'Evaluación', 'Examen del módulo 4',             '20 preguntas · 70 % para aprobar', 4, null)
on conflict (id) do nothing;

-- Mismo motivo: `lessons` también es UNIQUE (module_id, position) DEFERRABLE.
insert into lessons (id, module_id, position, title, duration_minutes) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 1, 'Repaso: Past Simple',              9),
  ('c0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 2, 'Present Perfect: forma',          12),
  ('c0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 3, 'Participios irregulares',         11),
  ('c0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 4, 'Ever, never, just, yet',          10),
  ('c0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000004', 5, 'Present Perfect vs. Past Simple', 14),
  ('c0000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000004', 6, 'Práctica guiada de diálogo',      13),
  ('c0000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000004', 7, 'Listening: at the market',         8),
  ('c0000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000004', 8, 'Evaluación del módulo',           20),
  ('c0000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000004', 9, 'Cierre y recursos extra',          6)
on conflict (id) do nothing;

insert into course_resources (id, course_id, type, title, meta, media_key, position) values
  ('d0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'PDF', 'Lista de verbos irregulares', 'Módulos 1-4 · 1,2 MB', null, 0),
  ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'MP3', 'Pack de listening B1', '12 audios · 38 MB', null, 1),
  ('d0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'DOC', 'Plantilla de diario en inglés', 'Uso diario · 90 KB', null, 2),
  ('d0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'PDF', 'Guía de pronunciación', 'Transcripción fonética · 640 KB', null, 3)
on conflict (id) do nothing;

insert into badges (name, requirement, position) values
  ('Racha de 7 días',   'Estudia 7 días seguidos',           0),
  ('Primer módulo',     'Completa tu primer módulo',         1),
  ('10 h de estudio',   'Acumula 10 horas de video',         2),
  ('Sin errores ×20',   'Resuelve 20 ejercicios sin fallar', 3),
  ('Maestro del pasado','Domina el Past Simple',             4),
  ('Racha de 30 días',  'Estudia 30 días seguidos',          5)
on conflict (name) do nothing;
