import { NextResponse } from 'next/server';

import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEMO_SESSION_COOKIE);
  return response;
}
