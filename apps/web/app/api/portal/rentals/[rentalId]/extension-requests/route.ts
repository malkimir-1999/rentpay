import { forwardCustomerApi } from '../../../../../../lib/server-api';

type Context = { params: Promise<{ rentalId: string }> };

export async function POST(request: Request, context: Context) {
  const { rentalId } = await context.params;
  return forwardCustomerApi(request, `/api/customer/rentals/${encodeURIComponent(rentalId)}/extension-requests`);
}
