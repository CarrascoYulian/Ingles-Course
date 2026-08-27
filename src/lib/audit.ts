import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

/**
 * Registra un evento de auditoría desde una ruta que ya resolvió el actor
 * vía `guard()` con cliente admin (service-role) — invitar/borrar/
 * desactivar estudiante o staff. Las acciones que corren con la sesión
 * anon del propio usuario (borrar curso/módulo/lección, publicar/archivar)
 * se loguean solas con triggers de Postgres (ven `auth.uid()`), no acá.
 */
export async function logAuditEvent(
  actor: Profile,
  action: string,
  entityType: string,
  entityId: string | null,
  label: string,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  await admin.from('audit_log').insert({
    actor_id: actor.id,
    actor_name: actor.fullName,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: label,
  });
}
