# Comandos

```bash
npm run dev         # Servidor de desarrollo (http://localhost:3000)
npm run typecheck   # tsc --noEmit — ejecuta ANTES de dar nada por terminado
npm run lint        # ESLint
npm test            # Vitest run (funciones puras)
npm run build       # Build de producción (como CI)
```

## Antes de pushear

```bash
npm run typecheck   # No omitir
npm run lint
npm test
npm run build       # Asegúrate de que pase localmente
```
