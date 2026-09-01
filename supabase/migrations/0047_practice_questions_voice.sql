-- El profesor pide poder elegir, por pregunta, qué voz neural lee la frase
-- en el juego de práctica (`/api/tts`, ver esa ruta) — antes todas sonaban
-- con la misma voz femenina. Se agrega la elección como dato de la pregunta,
-- no como config global, para poder alternar voces entre preguntas.
alter table practice_questions
  add column voice text not null default 'female' check (voice in ('female', 'male'));
