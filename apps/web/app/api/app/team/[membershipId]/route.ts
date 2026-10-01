import { forwardBusinessApi } from '../../../../../lib/server-api';

type RouteContext = { params: Promise<{ membershipId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { membershipId } = await context.params;
  return forwardBusinessApi(request, `/api/business/team/${encodeURIComponent(membershipId)}`);
}
