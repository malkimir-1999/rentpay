import { forwardBusinessApi } from '../../../../../lib/server-api';

type Context = { params: Promise<{ customerId: string }> };
function path(context: Context) { return context.params.then(({ customerId }) => `/api/business/customers/${encodeURIComponent(customerId)}`); }
export async function GET(request: Request, context: Context) { return forwardBusinessApi(request, await path(context)); }
export async function PATCH(request: Request, context: Context) { return forwardBusinessApi(request, await path(context)); }
export async function DELETE(request: Request, context: Context) { return forwardBusinessApi(request, await path(context)); }
