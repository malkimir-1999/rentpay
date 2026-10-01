import { auth } from '../../../../../../auth';
import { forwardBusinessApi, forwardCustomerApi } from '../../../../../../lib/server-api';

type Context = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  const { notificationId } = await context.params;
  if (session?.user.accountType === 'CUSTOMER') return forwardCustomerApi(request, `/api/customer/notifications/${encodeURIComponent(notificationId)}/read`);
  return forwardBusinessApi(request, `/api/business/notifications/${encodeURIComponent(notificationId)}/read`);
}
