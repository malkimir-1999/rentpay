import { forwardBusinessApi } from '../../../../../../../lib/server-api';

type Context = { params: Promise<{ customerId: string; driverId: string }> };
async function path(context: Context) {
  const { customerId, driverId } = await context.params;
  return `/api/business/customers/${encodeURIComponent(customerId)}/drivers/${encodeURIComponent(driverId)}`;
}
export async function PATCH(request: Request, context: Context) { return forwardBusinessApi(request, await path(context)); }
export async function DELETE(request: Request, context: Context) { return forwardBusinessApi(request, await path(context)); }
