-- `duration_minutes` no tiene precisión suficiente para clips reales
-- cortos: un video de 6 segundos se redondeaba hacia arriba a "1 min" (el
-- truco anterior para evitar que 0 se interpretara como "sin duración"),
-- mostrando una duración que no es la real. Segundos exactos, sin trucos.
alter table lessons add column duration_seconds integer;

update lessons set duration_seconds = duration_minutes * 60 where duration_seconds is null;
