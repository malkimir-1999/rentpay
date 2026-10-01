import { forwardBusinessApi } from '../../../../../../lib/server-api';

type Context = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, context: Context) {
  const { requestId } = await context.params;
  return forwardBusinessApi(request, `/api/business/rentals/extension-requests/${encodeURIComponent(requestId)}`);
}
