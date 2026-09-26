import { forwardBusinessApi } from '../../../../../../lib/server-api';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  if (!['start', 'complete', 'cancel'].includes(action)) return Response.json({ error: { message: 'Unknown maintenance action.' } }, { status: 404 });
  return forwardBusinessApi(request, `/api/business/maintenance/${encodeURIComponent(id)}/${action}`);
}
