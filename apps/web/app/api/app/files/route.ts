import { forwardBusinessApi } from '../../../../lib/server-api';

export function POST(request: Request) {
  return forwardBusinessApi(request, '/api/business/files');
}
