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

## Límite de subida actual — **corregido, ver actualización**

> **Actualización:** la primera versión de esta guía decía que el límite era 2 GB y recomendaba mantenerlo. Eso describía sólo la configuración del bucket (`supabase/migrations/0003_storage.sql`) — **no el límite real que aplica la plataforma.**

El proyecto corre en el **plan Free de Supabase**, que impone un **límite global de 50 MB por archivo** sin importar lo que diga la configuración del bucket (el bucket puede pedir hasta 2 GB, pero Supabase lo recorta a 50 MB en Free). Fuente: [Supabase — File limits](https://supabase.com/docs/guides/storage/uploads/file-limits).

Esto significa que, **ahora mismo, cualquier video de más de 50 MB probablemente falla al subirse** — algo que ni el código ni la guía anterior contemplaban. Un video de 10 minutos en 1080p con las recomendaciones de esta misma guía ya pesa bastante más de 50 MB.

También cambia la cuota total: el plan Free da **1 GB de Storage en total**, no 200 GB — corregido en el widget del panel admin (issue #39, `STORAGE_PLAN_LIMIT_BYTES`).

### Qué hacer con esto

- **Corto plazo:** si el equipo docente ya está subiendo videos reales, confirmar si están fallando (el panel debería mostrar un error de subida, no un fallo silencioso — revisar `src/lib/storage.ts` y `/api/uploads` si no es así).
- **Decisión pendiente, no técnica:** subir a un plan pago de Supabase (Pro: 500 GB por archivo, 100 GB de cuota total) es la solución real para un curso con contenido en video. Es una decisión de negocio/costo, no algo que este PR pueda resolver por su cuenta.
- Mientras tanto, cualquier subida debe mantenerse por debajo de 50 MB — en la práctica, esto empuja hacia clips más cortos, resolución 720p, y bitrates conservadores (ver recomendaciones arriba), no como optimización sino como restricción dura de la plataforma actual.

## Transcodificación automática (fuera de alcance de esta fase)

Normalizar automáticamente cada subida a un bitrate/formato objetivo en el servidor (issue #40, punto opcional) queda en el backlog: es la mejora de mayor esfuerzo y esta guía ya cubre el caso de uso actual sin necesitar infraestructura nueva (cola de transcodificación, worker, etc.).
