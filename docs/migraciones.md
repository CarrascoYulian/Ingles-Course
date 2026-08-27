# Migraciones

## Convención

- **Nombrado**: `supabase/migrations/NNNN_descripcion.sql`, numeradas secuencialmente
- **Inmutable**: nunca editar una migración ya mergeada — cada cambio nuevo es una migración nueva
- **RLS**: habilitado en toda tabla nueva desde el día uno
- **Funciones base de RLS**: `is_staff()` e `is_active_student()` (definidas en `0002_rls.sql`) — casi todas las políticas las reutilizan

## Aplicar migraciones

```bash
# Local development (Supabase CLI)
supabase db push

# Producción (via MCP de Supabase)
# Ver CLAUDE.md → Comandos para verificar primero con tsc --noEmit
```
