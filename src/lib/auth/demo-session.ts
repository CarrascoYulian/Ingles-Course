import 'server-only';

import { getServerEnv } from '@/lib/env';
import type { UserRole } from '@/types';

/**
 * Sesión de modo demo: sólo existe cuando no hay Supabase configurado.
 *
 * Antes, el modo demo devolvía siempre `DEMO_TEACHER` sin pasar por login —
 * la app "abría directo como admin". Esto reproduce el mismo contrato que
 * tendrá la sesión real de Supabase (una cookie que identifica el rol),
 * para que quitar el modo demo el día de mañana no cambie ni una línea de
 * `getCurrentProfile()` ni del middleware.
 *
 * La firma usa Web Crypto (`crypto.subtle`) y no `node:crypto`: este módulo
 * se importa desde `middleware.ts`, que Next.js ejecuta en el Edge Runtime,
 * y ese runtime no expone los módulos nativos de Node — sólo la API Web
 * Crypto estándar, disponible también en Node 18+.
 */

export const DEMO_SESSION_COOKIE = 'demo_session';

export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
}

/** Las dos cuentas de prueba pedidas: un administrador y un estudiante. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'admin@inglesconmetodo.demo', password: 'Admin#2026', role: 'admin' },
  { email: 'estudiante@inglesconmetodo.demo', password: 'Estudiante#2026', role: 'student' },
];

const encoder = new TextEncoder();

async function getKey(): Promise<CryptoKey> {
  const { DEMO_AUTH_SECRET } = getServerEnv();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(DEMO_AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(role: UserRole): Promise<string> {
  const key = await getKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(role));
  return `${role}.${toHex(signature)}`;
}

/** Devuelve el rol si la firma es válida; `null` si la cookie falta o fue manipulada. */
export async function verifyDemoSessionToken(token: string | undefined): Promise<UserRole | null> {
  if (!token) return null;
  const [role, providedHex] = token.split('.');
  if (!role || !providedHex) return null;
  if (role !== 'admin' && role !== 'instructor' && role !== 'student') return null;

  const key = await getKey();
  const provided = hexToBytes(providedHex);
  if (!provided) return null;

  const isValid = await crypto.subtle.verify('HMAC', key, provided, encoder.encode(role));
  return isValid ? role : null;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function createDemoSessionToken(role: UserRole): Promise<string> {
  return sign(role);
}

export function findDemoAccount(email: string, password: string): DemoAccount | null {
  const normalized = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find(
      (account) => account.email === normalized && account.password === password,
    ) ?? null
  );
}
