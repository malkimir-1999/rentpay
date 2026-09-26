import { forwardBusinessApi } from '../../../../../lib/server-api';

export function GET(request: Request) {
  return forwardBusinessApi(request, '/api/business/inspections/damage-cases');
}

export function POST(request: Request) {
  return forwardBusinessApi(request, '/api/business/inspections/damage-cases');
}
