import { forwardBusinessApi } from '../../../../../../lib/server-api';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardBusinessApi(request, `/api/business/reservations/${encodeURIComponent(id)}/ledger`);
}
