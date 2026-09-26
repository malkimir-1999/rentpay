import { forwardBusinessApi } from '../../../../../../lib/server-api';

export async function PATCH(request: Request, context: RouteContext<'/api/app/inspections/damage-cases/[id]'>) {
  const { id } = await context.params;
  return forwardBusinessApi(request, `/api/business/inspections/damage-cases/${encodeURIComponent(id)}`);
}
