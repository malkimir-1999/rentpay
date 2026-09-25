import { NextRequest, NextResponse } from 'next/server';

type ProxyContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: ProxyContext) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The service is temporarily unavailable.' } }, { status: 503 });

  const { path } = await context.params;
  const target = new URL(`/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`, apiUrl);
  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type', 'x-request-id']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'retry-after']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('cache-control', 'no-store');
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'We could not reach RentPay. Please try again.' } }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
