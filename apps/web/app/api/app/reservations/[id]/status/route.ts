import { forwardBusinessApi } from '../../../../../../lib/server-api';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return forwardBusinessApi(request, `/api/business/reservations/${encodeURIComponent(id)}/status`);
}
