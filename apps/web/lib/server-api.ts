import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '../auth';

const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export async function forwardBusinessApi(request: Request, path: string) {
  const session = await auth();
  if (!session?.apiAccessToken || session.user.accountType !== 'BUSINESS') {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } }, { status: 401 });
  }
  const upstream = new URL(path, apiOrigin);
  const incoming = new URL(request.url);
  upstream.search = incoming.search;
  const headers = new Headers({ authorization: `Bearer ${session.apiAccessToken}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
      cache: 'no-store',
    });
    const outgoing = new Headers({ 'cache-control': 'no-store' });
    const responseType = response.headers.get('content-type');
    if (responseType) outgoing.set('content-type', responseType);
    return new NextResponse(response.body, { status: response.status, headers: outgoing });
  } catch {
    return NextResponse.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'RentPay could not be reached. Please try again.' } }, { status: 503 });
  }
}
