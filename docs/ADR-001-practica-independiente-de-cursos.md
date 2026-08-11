# ADR 001 — Práctica y Cursos son independientes

**Estado:** Aceptado (2026-08-08)

## Contexto

La plataforma tiene dos flujos de aprendizaje separados:

- **Cursos**: módulos, lecciones y video subidos por el docente, con
  progreso por lección (`lesson_progress`, `enrollments`).
- **Práctica**: modo de juego estilo Duolingo con XP, corazones, rachas y
  niveles (`practice_progress`, `practice_levels`, `practice_questions`).

No existía ninguna decisión documentada sobre si el avance de uno debía
afectar al otro (p. ej. desbloquear niveles de Práctica al completar
módulos del Curso, o viceversa).

## Decisión

**Práctica y Cursos permanecen completamente independientes.** Completar
las tareas asignadas por el docente (ver videos, materiales, lecciones) no
afecta el progreso del juego de Práctica, y jugar Práctica no afecta el
avance del Curso.

## Razón

Decisión explícita del propietario del producto: son dos experiencias
distintas con objetivos distintos — el Curso mide cumplimiento del plan de
estudios asignado; Práctica es refuerzo lúdico opcional. Mezclarlas
introduciría reglas de desbloqueo cruzado que nadie pidió y complicaría
ambos sistemas sin beneficio claro.

## Consecuencias

- `LearningPort` (Cursos) y `PracticePort` (Práctica) siguen siendo
  interfaces separadas, sin dependencias entre sí.
- No hay ni habrá lógica de "desbloquear nivel de Práctica al completar
  módulo X" ni al revés.
- Si en el futuro se quisiera cambiar esto, requiere una nueva decisión de
  producto — no es algo que deba inferirse del código.
