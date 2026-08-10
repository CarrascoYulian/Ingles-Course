-- Antes "Misión de hoy", "Desafío semanal" y "Próxima insignia" eran
-- literales fijos en el JSX (45/60 XP, 3/5 días, "Maestro del pasado") sin
-- ningún dato real detrás. Esta tabla registra cuánto XP gana el alumno
-- cada día — es lo que permite calcular la meta diaria real, la racha de
-- los últimos 7 días y cuánto falta para la siguiente insignia.
create table practice_daily_progress (
  student_id  uuid not null references profiles (id) on delete cascade,
  date        date not null,
  xp_earned   integer not null default 0 check (xp_earned >= 0),
  goal_met    boolean not null default false,

  primary key (student_id, date)
);

alter table practice_daily_progress enable row level security;

create policy "progreso diario propio visible"
  on practice_daily_progress for select
  using ((student_id = auth.uid() and is_active_student()) or is_staff());

create policy "progreso diario propio insertable"
  on practice_daily_progress for insert
  with check (student_id = auth.uid() and is_active_student());

create policy "progreso diario propio actualizable"
  on practice_daily_progress for update
  using (student_id = auth.uid() and is_active_student())
  with check (student_id = auth.uid() and is_active_student());
