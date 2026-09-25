import { forwardBusinessApi } from '../../../../../../lib/server-api';

type Context = { params: Promise<{ customerId: string }> };
export async function POST(request: Request, context: Context) {
  const { customerId } = await context.params;
  return forwardBusinessApi(request, `/api/business/customers/${encodeURIComponent(customerId)}/drivers`);
}
