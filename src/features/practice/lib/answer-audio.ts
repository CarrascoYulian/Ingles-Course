/**
 * Feedback sonoro al corregir una respuesta: un chime/buzz sintetizado con
 * Web Audio API (sin archivos de audio) y una voz que lee la frase correcta
 * en inglés — voz neural de `/api/tts` (ver esa ruta), con la Web Speech API
 * del navegador como respaldo si la red falla.
 *
 * Todo acá es best-effort: si el navegador no soporta alguna API, la red
 * falla, o el usuario nunca interactuó (autoplay policy), las funciones
 * simplemente no hacen nada — nunca deben romper el flujo de práctica.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

/**
 * Crea y desbloquea el `AudioContext` de forma síncrona, dentro del mismo
 * gesto de click que dispara "Comprobar".
 *
 * Los navegadores sólo permiten `resume()` en respuesta directa a un gesto
 * del usuario. El chequeo de la respuesta viaja por una mutation async
 * (`onSuccess` llega después del round-trip al servidor), momento en el que
 * ya no hay gesto activo — por eso `playCorrectChime`/`playIncorrectBuzz`
 * sonaban mudos aunque se llamaran sin error. Llamando esto de entrada en el
 * handler de click, el contexto queda "running" y las notas programadas más
 * tarde (en el `onSuccess`) sí se escuchan.
 */
export function primeAudio() {
  getAudioContext();
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, type: OscillatorType) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.15, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

/** Dos notas ascendentes cortas, tipo "ding-ding". */
export function playCorrectChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, 659.25, now, 0.14, 'sine'); // E5
  playTone(ctx, 987.77, now + 0.1, 0.18, 'sine'); // B5
}

/** Una nota corta y grave, tipo "buzz". */
export function playIncorrectBuzz() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, 146.83, now, 0.22, 'square'); // D3
}

// Todo sintetizado (sin archivo de audio de por medio): un acorde sostenido
// muy grave con cada nota "respirando" en volumen vía su propio LFO. `nodes`
// guarda TODO lo que hay que apagar al parar (osciladores de nota + de LFO).
let ambientMasterGain: GainNode | null = null;
let ambientNodes: OscillatorNode[] = [];

/**
 * Arranca la musiquita ambiental de fondo del juego (looping, muy bajo
 * volumen). Como `startAmbientMusic()`/`primeAudio()`, sólo suena si se llama
 * dentro de un gesto del usuario — por eso se dispara en el primer click del
 * alumno (seleccionar una opción o tocar el ícono de sonido), no al montar.
 */
export function startAmbientMusic() {
  const ctx = getAudioContext();
  if (!ctx || ambientMasterGain) return;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 2.5);
  master.connect(ctx.destination);
  ambientMasterGain = master;

  const notes = [130.81, 164.81, 196.0, 261.63]; // C3, E3, G3, C4
  notes.forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;

    const noteGain = ctx.createGain();
    noteGain.gain.value = 1 / notes.length;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.04 + i * 0.015;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.2;
    lfo.connect(lfoGain);
    lfoGain.connect(noteGain.gain);

    osc.connect(noteGain);
    noteGain.connect(master);
    osc.start();
    lfo.start();

    ambientNodes.push(osc, lfo);
  });
}

/** Apaga la musiquita ambiental con un fade corto para que no corte en seco. */
export function stopAmbientMusic() {
  if (!ambientMasterGain) return;
  const ctx = audioContext;
  const master = ambientMasterGain;
  const nodes = ambientNodes;
  ambientMasterGain = null;
  ambientNodes = [];

  if (ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  }
  window.setTimeout(() => {
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Ya pudo haberse detenido; no pasa nada.
      }
    });
  }, 700);
}

/**
 * Prioriza voces en inglés, prefiriendo en-US. Función pura (no llama a
 * `speechSynthesis.getVoices()` ella misma) para poder testearla sin DOM.
 */
export function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  return (
    english.find((voice) => voice.lang.toLowerCase() === 'en-us') ??
    english.find((voice) => voice.default) ??
    english[0] ??
    null
  );
}

// Objeto URL por frase ya sintetizada — la misma pregunta se repite seguido
// (reintento tras fallar) y no tiene sentido pedirle el audio a `/api/tts`
// de nuevo cada vez.
const ttsCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;

function speakEnglishFallback(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  const voice = pickEnglishVoice(window.speechSynthesis.getVoices());
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function playCachedAudio(url: string) {
  currentAudio?.pause();
  const audio = new Audio(url);
  currentAudio = audio;
  void audio.play().catch(() => {});
}

/**
 * Lee `text` en voz alta en inglés con la voz neural de `/api/tts`
 * (femenina o masculina, elegida por el profesor en la pregunta),
 * cancelando cualquier lectura en curso. Si la petición falla (red, ruta
 * caída), recurre a la Web Speech API del navegador.
 */
export function speakEnglish(text: string, voice: 'female' | 'male' = 'female') {
  if (typeof window === 'undefined') return;

  const cacheKey = `${voice}:${text}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    playCachedAudio(cached);
    return;
  }

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error('tts request failed'))))
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      ttsCache.set(cacheKey, url);
      playCachedAudio(url);
    })
    .catch(() => speakEnglishFallback(text));
}
