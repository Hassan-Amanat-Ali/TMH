import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { localeCookieName, localeHeaderName } from './lib/i18n';
import { detectLocaleFromRequest } from './lib/i18n/server';

// Pages that require any signed-in member.
const MEMBER_PREFIXES = [
  '/dashboard',
  '/profiles',
  '/my-profile',
  '/messages',
  '/likes',
  '/visitors',
  '/reels',
  '/verify-me',
];
// Pages that require an admin session.
const ADMIN_PREFIXES = ['/admin'];
const LAUNCH_PUBLIC_PATHS = ['/coming-soon', '/login', '/forgot-password', '/reset-password'];
const launchModeCacheTtlMs = 20_000;
let cachedLaunchMode: { value: 'COMING_SOON' | 'LIVE'; expiresAt: number } | null = null;

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || process.env.NEXTAUTH_URL || '';
  return raw
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function isAllowedDuringComingSoon(pathname: string) {
  return LAUNCH_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function getLaunchMode(request: NextRequest): Promise<'COMING_SOON' | 'LIVE'> {
  if (cachedLaunchMode && cachedLaunchMode.expiresAt > Date.now()) {
    return cachedLaunchMode.value;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 700);
    const response = await fetch(new URL('/api/launch-state', request.url), {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return 'COMING_SOON';
    const data = (await response.json()) as { launchMode?: string };
    const value = data.launchMode === 'LIVE' ? 'LIVE' : 'COMING_SOON';
    cachedLaunchMode = { value, expiresAt: Date.now() + launchModeCacheTtlMs };
    return value;
  } catch {
    return 'COMING_SOON';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // ----- API: scoped CORS (no more wildcard) -----
  if (pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) });
    }
    const response = NextResponse.next();
    Object.entries(corsHeadersFor(origin)).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;
  }

  // ----- Page route guards (real session, not localStorage) -----
  const needsMember = MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (needsMember || needsAdmin) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (needsAdmin && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ----- Launch gate: blocks logged-out public visitors only -----
  if (!token && !isAllowedDuringComingSoon(pathname)) {
    const launchMode = await getLaunchMode(request);
    if (launchMode === 'COMING_SOON') {
      const comingSoonUrl = new URL('/coming-soon', request.url);
      if (pathname !== '/') comingSoonUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(comingSoonUrl);
    }
  }

  // ----- Locale detection (unchanged) -----
  const detectedLocale = detectLocaleFromRequest(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeHeaderName, detectedLocale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(localeCookieName, detectedLocale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.).*)'],
};
