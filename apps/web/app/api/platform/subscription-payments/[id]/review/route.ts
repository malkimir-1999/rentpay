import { forwardPlatformApi } from '../../../../../../lib/server-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return forwardPlatformApi(request, `/api/platform/subscription-payments/${encodeURIComponent(id)}/review`);
}
