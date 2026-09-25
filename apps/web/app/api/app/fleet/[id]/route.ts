import { forwardBusinessApi } from '../../../../../lib/server-api';

type RouteContext = { params: Promise<{ id: string }> };

async function forward(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return forwardBusinessApi(request, `/api/business/fleet/${encodeURIComponent(id)}`);
}

export const GET = forward;
export const PATCH = forward;
export const DELETE = forward;
