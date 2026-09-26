import { forwardPublicApi } from '../../../../../../lib/server-api';

type RouteContext = { params: Promise<{ businessSlug: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { businessSlug } = await context.params;
  return forwardPublicApi(request, `/api/public/rentals/${encodeURIComponent(businessSlug)}/requests`);
}
