import { forwardBusinessApi } from '../../../../../lib/server-api';

type Context = { params: Promise<{ id: string }> };
async function forward(request: Request, context: Context) {
  const { id } = await context.params;
  return forwardBusinessApi(request, `/api/business/locations/${encodeURIComponent(id)}`);
}
export const GET = forward;
export const PATCH = forward;
export const DELETE = forward;
