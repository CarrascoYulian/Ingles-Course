# Testing

## Setup

- **Framework**: Vitest
- **Entorno**: `node` (sin jsdom, sin `@testing-library/react`)
- **Scope**: **solo funciones puras** — nada que dependa de renderizar componentes o DOM real

## Patrón

1. Extrae el cálculo a un módulo **sin** `server-only` ni dependencias de React
2. Testea ese módulo

**Ejemplos**:
- `src/app/api/practice/logic.ts`
- `src/features/learning/video-progress-math.ts`
- `src/services/supabase/mappers.ts`
- `src/lib/auth/rbac.ts`

## Si necesitas testear componentes/hooks reales

Primero instala `@testing-library/react` + un entorno DOM y **decide explícitamente**. No asumir que ya está disponible.

## Comando

```bash
npm test  # vitest run
```
