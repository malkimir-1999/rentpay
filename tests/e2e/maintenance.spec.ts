import { test, expect } from '@playwright/test';
import { E2E_API_BASE_URL } from './urls';

const api = E2E_API_BASE_URL;
const password = 'RentPay-Maintenance-Testing-2026!';

async function owner(request: import('@playwright/test').APIRequestContext, suffix: string) {
  const email = `maintenance-${suffix}-${Date.now()}@example.test`;
  const registration = await request.post(`${api}/auth/register`, { data: { email, password, businessName: `Maintenance ${suffix}`, name: `Service Owner ${suffix}`, termsAccepted: true } });
  expect(registration.status()).toBe(201);
  const { businessId } = await registration.json() as { businessId: string };
  const messages = await request.get(`${api}/dev/mailbox`).then((res) => res.json()) as Array<{ recipient: string; event: string; text: string }>;
  const verification = messages.reverse().find((message) => message.recipient === email && message.event === 'EMAIL_VERIFICATION');
  expect(verification).toBeTruthy();
  const token = new URL(verification!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token');
  expect((await request.post(`${api}/auth/verify-email`, { data: { token } })).status()).toBe(204);
  const login = await request.post(`${api}/auth/login`, { data: { email, password, accountType: 'BUSINESS' } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  return { businessId, email, headers: { authorization: `Bearer ${accessToken}`, 'x-business-id': businessId } };
}

test('maintenance is tenant isolated, blocks booking windows, and requires permission', async ({ request, page }) => {
  const [a, b] = await Promise.all([owner(request, 'a'), owner(request, 'b')]);
  const vehicleResponse = await request.post(`${api}/business/fleet`, { headers: a.headers, data: { make: 'Toyota', model: 'Yaris', registrationNumber: `MAINT-${Date.now()}`, dailyRateMinor: 800000 } });
  expect(vehicleResponse.status()).toBe(201);
  const vehicle = await vehicleResponse.json() as { id: string };
  const startAt = new Date(Date.now() + 5 * 86400000).toISOString();
  const endAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const create = await request.post(`${api}/business/maintenance`, { headers: a.headers, data: { vehicleId: vehicle.id, title: 'Replace brake pads', dueAt: startAt, scheduledStartAt: startAt, expectedEndAt: endAt, blocksAvailability: true, businessId: b.businessId } });
  expect(create.status()).toBe(201);
  const order = await create.json() as { id: string; status: string };
  expect(order.status).toBe('PLANNED');
  expect((await request.get(`${api}/business/maintenance`, { headers: b.headers }).then((res) => res.json()) as Array<{ id: string }>).some((item) => item.id === order.id)).toBeFalsy();
  expect((await request.get(`${api}/business/maintenance/${order.id}`, { headers: b.headers })).status()).toBe(404);
  expect((await request.patch(`${api}/business/maintenance/${order.id}`, { headers: b.headers, data: { title: 'Changed by another business' } })).status()).toBe(404);
  expect((await request.post(`${api}/business/maintenance/${order.id}/cancel`, { headers: b.headers, data: { reason: 'Cross tenant' } })).status()).toBe(404);
  expect((await request.get(`${api}/business/maintenance/guessed-id`, { headers: a.headers })).status()).toBe(404);
  expect((await request.post(`${api}/business/maintenance`, { headers: b.headers, data: { vehicleId: vehicle.id, title: 'Wrong tenant work', blocksAvailability: true } })).status()).toBe(404);
  expect((await request.get(`${api}/business/maintenance`, { headers: { ...a.headers, 'x-business-id': b.businessId } })).status()).toBe(403);
  expect((await request.get(`${api}/business/maintenance`)).status()).toBe(401);
  const availability = await request.get(`${api}/business/availability?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`, { headers: a.headers });
  expect(availability.status()).toBe(200);
  const available = await availability.json() as { vehicles: Array<{ id: string }> };
  expect(available.vehicles.some((item) => item.id === vehicle.id)).toBeFalsy();
  const due = await request.get(`${api}/business/operations/today`, { headers: a.headers }).then((res) => res.json()) as { maintenanceDue: number };
  expect(due.maintenanceDue).toBeGreaterThanOrEqual(1);
  const cancel = await request.post(`${api}/business/maintenance/${order.id}/cancel`, { headers: a.headers, data: { reason: 'Repair rescheduled' } });
  expect(cancel.status()).toBe(201);
  expect((await cancel.json() as { status: string }).status).toBe('CANCELLED');
  const after = await request.get(`${api}/business/availability?startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`, { headers: a.headers }).then((res) => res.json()) as { vehicles: Array<{ id: string }> };
  expect(after.vehicles.some((item) => item.id === vehicle.id)).toBeTruthy();
  const location = await request.post(`${api}/business/locations`, { headers: a.headers, data: { name: 'Maintenance Test Desk', timezone: 'Asia/Karachi' } }).then((res) => res.json()) as { id: string };
  const customer = await request.post(`${api}/business/customers`, { headers: a.headers, data: { fullName: 'Maintenance Test Renter', phone: '+923001110008' } }).then((res) => res.json()) as { id: string };
  const reservation = await request.post(`${api}/business/reservations`, { headers: a.headers, data: { customerId: customer.id, vehicleId: vehicle.id, pickupLocationId: location.id, startAt, endAt } });
  expect(reservation.status()).toBe(201);
  const overlappingWork = await request.post(`${api}/business/maintenance`, { headers: a.headers, data: { vehicleId: vehicle.id, title: 'Conflicting planned service', scheduledStartAt: startAt, expectedEndAt: endAt, blocksAvailability: true } });
  expect(overlappingWork.status()).toBe(409);
  const nextEnd = new Date(Date.now() + 2 * 86400000).toISOString();
  const second = await request.post(`${api}/business/maintenance`, { headers: a.headers, data: { vehicleId: vehicle.id, title: 'Inspect cooling system', scheduledStartAt: new Date().toISOString(), expectedEndAt: nextEnd, blocksAvailability: true } });
  expect(second.status()).toBe(201);
  const secondOrder = await second.json() as { id: string };
  expect((await request.post(`${api}/business/maintenance/${secondOrder.id}/start`, { headers: a.headers })).status()).toBe(201);
  expect((await request.patch(`${api}/business/fleet/${vehicle.id}`, { headers: a.headers, data: { condition: 'READY' } })).status()).toBe(409);
  expect((await request.post(`${api}/business/maintenance/${secondOrder.id}/complete`, { headers: a.headers, data: { completionNotes: 'Cooling system tested and repaired', actualCostMinor: 250000 } })).status()).toBe(201);
  const finishedVehicle = await request.get(`${api}/business/fleet/${vehicle.id}`, { headers: a.headers }).then((res) => res.json()) as { condition: string };
  expect(finishedVehicle.condition).toBe('PREPARATION');
  expect((await request.patch(`${api}/business/fleet/${vehicle.id}`, { headers: a.headers, data: { condition: 'READY' } })).status()).toBe(409);
  const checklist = { exterior: 'OK', glass: 'OK', tires: 'OK', lights: 'OK', interior: 'OK', documents: 'OK', accessories: 'OK' };
  expect((await request.post(`${api}/business/inspections`, { headers: b.headers, data: { vehicleId: vehicle.id, stage: 'MAINTENANCE_RELEASE', checklist, odometerKm: 0, fuelPercent: 50 } })).status()).toBe(404);
  const release = await request.post(`${api}/business/inspections`, { headers: a.headers, data: { vehicleId: vehicle.id, stage: 'MAINTENANCE_RELEASE', checklist, odometerKm: 0, fuelPercent: 50 } });
  expect(release.status()).toBe(201);
  expect((await release.json() as { maintenanceWorkOrderId: string }).maintenanceWorkOrderId).toBe(secondOrder.id);
  const readyVehicle = await request.get(`${api}/business/fleet/${vehicle.id}`, { headers: a.headers }).then((res) => res.json()) as { condition: string };
  expect(readyVehicle.condition).toBe('READY');
  await page.goto('/login');
  await page.getByLabel('Email').fill(a.email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard\/onboarding/);
  await page.goto('/app/maintenance');
  await expect(page.getByRole('heading', { name: 'Maintenance', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan service' })).toBeVisible();
  for (const width of [320, 375, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('body *')].map((element) => ({ tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right) })).filter((element) => element.right > innerWidth + 1).slice(0, 10) }));
    expect(layout.scrollWidth, `Maintenance overflow at ${width}px: ${JSON.stringify(layout.overflow)}`).toBeLessThanOrEqual(width);
  }
});
