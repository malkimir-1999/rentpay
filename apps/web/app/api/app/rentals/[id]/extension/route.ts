import { forwardBusinessApi } from '../../../../../../lib/server-api';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardBusinessApi(request, `/api/business/rentals/${encodeURIComponent(id)}/extension`);
}
