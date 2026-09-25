import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = randomBytes(18).toString('base64');
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    // Ant Design's CSS-in-JS registry emits server-rendered <style> tags. A
    // nonce source suppresses unsafe-inline in CSP3, but the registry does not
    // currently attach that nonce; keeping styles self + inline restores its
    // generated styles while scripts remain nonce-protected below.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    ...(process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', policy);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', policy);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
