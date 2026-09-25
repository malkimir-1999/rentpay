import { forwardBusinessApi } from '../../../../lib/server-api';

export function GET(request: Request) { return forwardBusinessApi(request, '/api/business/reservations'); }
export function POST(request: Request) { return forwardBusinessApi(request, '/api/business/reservations'); }
