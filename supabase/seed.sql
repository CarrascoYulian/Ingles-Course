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

-- `lessons` tiene un UNIQUE (module_id, position) DEFERRABLE — se necesita
-- así para que reordenar (intercambiar posiciones) no viole la restricción
-- a mitad de transacción. Pero un UNIQUE DEFERRABLE no puede ser árbitro de
-- ON CONFLICT, así que aquí se fija un `id` explícito y se hace conflicto
-- sobre él en su lugar. Una sola tabla para todo el contenido del módulo
-- (video, PDF, audio, ejercicio, evaluación): el orden que ve el docente en
-- el editor es el mismo que recorre el alumno.
insert into lessons (id, module_id, position, type, title, meta, duration_minutes, media_key) values
  ('c0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004', 0, 'Video',      'Repaso: Past Simple',              '9 min · 1080p',                    9,  null),
  ('c0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004', 1, 'Video',      'Present Perfect: forma',            '12 min · 1080p',                   12, null),
  ('c0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000004', 2, 'PDF',        'Guía de tiempos perfectos',         '820 KB',                           0,  'cursos/22222222/modulos/mod-4/guia.pdf'),
  ('c0000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000004', 3, 'Video',      'Ever, never, just, yet',            '10 min · 1080p',                   10, null),
  ('c0000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000004', 4, 'Video',      'Present Perfect vs. Past Simple',   '14 min · 1080p',                   14, 'cursos/22222222/modulos/mod-4/present-perfect.mp4'),
  ('c0000000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000004', 5, 'Video',      'Práctica guiada de diálogo',        '13 min · 1080p',                   13, null),
  ('c0000000-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000004', 6, 'Audio',      'Listening: at the market',          '4,2 MB',                           0,  'cursos/22222222/modulos/mod-4/listening.mp3'),
  ('c0000000-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000004', 7, 'Evaluación', 'Evaluación del módulo',             '20 preguntas · 70 % para aprobar', 0,  null),
  ('c0000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000004', 8, 'Video',      'Cierre y recursos extra',           '6 min · 1080p',                    6,  null)
on conflict (id) do nothing;

insert into badges (name, requirement, position) values
  ('Racha de 7 días',   'Estudia 7 días seguidos',           0),
  ('Primer módulo',     'Completa tu primer módulo',         1),
  ('10 h de estudio',   'Acumula 10 horas de video',         2),
  ('Sin errores ×20',   'Resuelve 20 ejercicios sin fallar', 3),
  ('Maestro del pasado','Domina el Past Simple',             4),
  ('Racha de 30 días',  'Estudia 30 días seguidos',          5)
on conflict (name) do nothing;
