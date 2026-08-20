# Guía de subida de archivos para el equipo docente

**Issue:** #40 (Fase 4 del milestone de Storage). Las fases previas (#37-#39) cierran la fuga de espacio y dan visibilidad del uso real; esta guía reduce cuánto pesa lo que se sube desde el origen.

## Por qué importa

Cada video y PDF subido a un curso se queda en Supabase Storage mientras el curso exista — a diferencia de una fuga o un huérfano, este es contenido real y publicado, así que no lo borra ningún job de limpieza (ver #38). La única forma de controlar el crecimiento a largo plazo es que lo que se sube pese lo justo desde el principio.

## Formato recomendado

- **Contenedor:** MP4.
- **Codec de video:** H.264 (compatibilidad universal) o H.265/HEVC (30-50 % más liviano al mismo nivel de calidad, si el software de edición lo soporta).
- **Codec de audio:** AAC.

Evitar contenedores/codecs poco comunes (MOV con ProRes, AVI, WMV, MKV con codecs exóticos): pesan mucho más para el mismo contenido y algunos navegadores no los reproducen bien.

## Resolución sugerida

**720p a 1080p es suficiente** para un curso de inglés grabado en cámara o pantalla. No hace falta subir en 4K:

- Un video de 10 minutos en 4K puede pesar 5-10× más que el mismo video en 1080p.
- El curso se ve en un reproductor embebido, normalmente a menos de 1000px de ancho — la resolución extra de 4K no se aprecia y sólo suma costo de almacenamiento y de banda ancha en cada reproducción.

## Compresión antes de subir

Si el archivo exportado pesa más de ~500 MB para un video de menos de 20 minutos, probablemente se puede comprimir sin pérdida notoria de calidad:

- **HandBrake** (gratis, Windows/Mac/Linux) con el preset "Fast 1080p30" o "Fast 720p30" es suficiente para la mayoría de los casos.
- Herramientas de edición (Premiere, DaVinci Resolve, CapCut) también permiten exportar directamente en H.264/H.265 a un bitrate razonable (8-12 Mbps para 1080p es un buen punto de partida).

## PDFs y otros documentos

- Exportar PDFs "optimizados para web" en vez de con imágenes sin comprimir — la mayoría de los editores (Word, Canva, Adobe) tienen esa opción al exportar.
- Evitar escanear páginas como imágenes de alta resolución cuando el documento es texto — un PDF de texto real pesa una fracción de un PDF escaneado.

## Límite de subida actual — **resuelto, migrado a Cloudflare R2**

> **Actualización (2026-08-19):** los binarios grandes (video, imagen, audio, PDF, documentos) ya no se suben a Supabase Storage — se subieron los límites del plan Free (50 MB por archivo, 1 GB de cuota total) tan bajos que un curso con video real no era viable ahí. Ahora se suben a **Cloudflare R2** (ver `src/lib/storage.ts`, `R2_*` en `.env.example`). Postgres/Supabase sigue guardando todo lo demás (perfiles, cursos, progreso, comentarios) — sólo el binario en sí se movió.

R2 no impone un límite de tamaño por archivo comparable al de Supabase Free, y su cuota gratuita es 10 GB de almacenamiento (`STORAGE_PLAN_LIMIT_BYTES` en `src/lib/storage.ts`) sin cobrar egress. Las recomendaciones de formato/resolución/compresión de esta guía siguen siendo buena práctica para no gastar cuota innecesariamente, pero **ya no son una restricción dura de la plataforma** — un video de 10 minutos en 1080p sube sin problema.

## Transcodificación automática (fuera de alcance de esta fase)

Normalizar automáticamente cada subida a un bitrate/formato objetivo en el servidor (issue #40, punto opcional) queda en el backlog: es la mejora de mayor esfuerzo y esta guía ya cubre el caso de uso actual sin necesitar infraestructura nueva (cola de transcodificación, worker, etc.).
