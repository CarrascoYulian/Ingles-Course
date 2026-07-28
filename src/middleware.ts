import { NextResponse, type NextRequest } from 'next/server';

import { isStaff } from '@/lib/auth/rbac';
import { updateSession } from '@/lib/supabase/middleware';
import { LANDING_BY_ROLE, PROTECTED_PREFIXES, ROUTES, STAFF_PREFIXES } from '@/constants/routes';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId, role } = await updateSession(request);

  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Un estudiante que intenta entrar al panel docente vuelve a su curso.
  const needsStaff = STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (needsStaff && !isStaff(role)) {
    const url = request.nextUrl.clone();
    url.pathname = role ? LANDING_BY_ROLE[role] : ROUTES.login;
    return NextResponse.redirect(url);
  }

  // Ya autenticado: la pantalla de login no aporta nada.
  if (pathname === ROUTES.login && userId && role) {
    const url = request.nextUrl.clone();
    url.pathname = LANDING_BY_ROLE[role];
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Todo salvo estáticos, imágenes optimizadas y el favicon.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
