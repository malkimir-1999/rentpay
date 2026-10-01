import { forwardPlatformApi } from '../../../../lib/server-api';

export function GET(request: Request) { return forwardPlatformApi(request, '/api/platform/plans'); }
export function POST(request: Request) { return forwardPlatformApi(request, '/api/platform/plans'); }
