import 'server-only';

/**
 * El alumno entra con matrícula + PIN de 4 dígitos, no con una contraseña
 * de texto libre. Supabase Auth exige contraseñas de al menos 6
 * caracteres, así que la contraseña real que se guarda en Auth se deriva
 * combinando la matrícula (única por alumno) con el PIN — nunca se
 * almacena ni se compara el PIN solo. Se usa igual al crear la cuenta
 * (`/api/students/invite`) y al iniciar sesión (`/api/auth/login`).
 */
export function derivePinPassword(enrollmentCode: string, pin: string): string {
  return `${enrollmentCode.toUpperCase()}::pin::${pin}`;
}
