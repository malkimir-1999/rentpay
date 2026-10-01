import { forwardCustomerApi } from '../../../../lib/server-api';

export function GET(request: Request) {
  return forwardCustomerApi(request, '/api/customer/extension-requests');
}
