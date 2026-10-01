import { auth } from '../../../../auth';
import { forwardBusinessApi, forwardCustomerApi } from '../../../../lib/server-api';

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.accountType === 'CUSTOMER') return forwardCustomerApi(request, '/api/customer/notifications');
  return forwardBusinessApi(request, '/api/business/notifications');
}
