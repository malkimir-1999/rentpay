import { forwardBusinessApi } from '../../../../../../lib/server-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return forwardBusinessApi(request, `/api/business/rentals/${encodeURIComponent(id)}/settlement`);
}
