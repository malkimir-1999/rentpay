import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { E2E_API_BASE_URL, E2E_WEB_ORIGIN } from './urls';

const api = E2E_API_BASE_URL;
const testPassword = 'RentPay-Phase2-Testing-2026!';
const reviewDir = process.env.PHASE2_REVIEW_DIR;
async function capture(page: import('@playwright/test').Page, name: string) {
  if (!reviewDir) return;
  await mkdir(reviewDir, { recursive: true });
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.55, 1);
    for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
      window.scrollTo(0, top);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(reviewDir, name), fullPage: true, animations: 'disabled' });
}
async function checkResponsiveWidths(page: import('@playwright/test').Page) {
  for (const width of [320, 375, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 960 });
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].map((element) => ({ element: element.tagName, classes: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right) })).filter((item) => item.right > window.innerWidth + 1).slice(0, 8) }));
    expect(overflow.page, `Horizontal overflow on ${page.url()} at ${width}px: ${JSON.stringify(overflow.elements)}`).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
async function latestToken(request: import('@playwright/test').APIRequestContext, recipient: string, event: string) {
  const response = await request.get(`${api}/dev/mailbox`);
  const messages = await response.json() as { recipient: string; event: string; text: string }[];
  const matching = messages.reverse().find((message) => message.recipient === recipient && message.event === event);
  expect(matching).toBeTruthy();
  return new URL(matching!.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token')!;
}

test('public pages have unique SEO metadata and work at required widths', async ({ page }) => {
  const routes = ['/', '/features', '/how-it-works', '/pricing', '/solutions', '/solutions/small-rental-business', '/solutions/growing-fleets', '/about', '/contact', '/faq', '/legal/privacy', '/legal/terms'];
  const titles = new Set<string>();
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main h1').first()).toBeVisible();
    const title = await page.title();
    expect(title).not.toBe('');
    expect(titles.has(title)).toBeFalsy();
    titles.add(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${E2E_WEB_ORIGIN}${route === '/' ? '' : route}`);
    await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', '');
    await capture(page, `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-desktop.png`);
  }
  const sitemap = await page.request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  expect(sitemap.headers()['content-type']).toContain('xml');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.length).toBeGreaterThan(0);
  for (const item of structuredData) expect(() => JSON.parse(item)).not.toThrow();
  await page.goto('/contact');
  await page.getByLabel('Your name').fill('Product Enquiry');
  await page.getByLabel('Work email').fill(`contact-${Date.now()}@example.test`);
  await page.getByLabel('What would you like to know?').fill('We would like to arrange a product walkthrough for our rental team.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: 'Message sent.' })).toBeVisible();
  for (const width of [320, 375, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width < 768) {
      await page.getByLabel('Open navigation').click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Features' }).click();
      await expect(page).toHaveURL(/\/features$/);
    }
  }
  expect(browserErrors).toEqual([]);
  for (const [route, name] of [['/', 'home'], ['/features', 'features']] as const) {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await capture(page, `${name}-tablet.png`);
  }
  for (const [route, name] of [['/', 'home'], ['/login', 'login'], ['/register', 'register']] as const) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await checkResponsiveWidths(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await capture(page, `${name}-mobile.png`);
  }
});

test('business registration verifies email and completes persisted onboarding and invitation acceptance', async ({ page, request }) => {
  const stamp = Date.now();
  const email = `phase2-owner-${stamp}@example.test`;
  await page.goto('/register');
  await capture(page, 'register-desktop.png');
  await page.getByLabel('Your name').fill('RentPay Phase Two Owner');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Business name').fill('Phase Two Rental Co');
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Start your 30-day trial' }).click();
  await expect(page.getByRole('heading', { name: 'Your 30-day trial is ready.' })).toBeVisible();
  const verificationToken = await latestToken(request, email, 'EMAIL_VERIFICATION');
  await page.goto(`/verify-email?token=${verificationToken}`);
  await capture(page, 'verify-email-desktop.png');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Email verified.' })).toBeVisible();
  await capture(page, 'verify-email-success-desktop.png');
  await page.goto('/login');
  await capture(page, 'login-desktop.png');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Bring your rental basics into one clear workspace.' })).toBeVisible();
  await capture(page, 'onboarding-00-welcome-desktop.png');
  await checkResponsiveWidths(page);
  await page.getByRole('button', { name: 'Start business setup' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible();
  const trialSession = await page.evaluate(async () => await (await fetch('/api/auth/session')).json() as { apiAccessToken: string; user: { businessId: string } });
  const subscription = await request.get(`${api}/business/subscription`, { headers: { authorization: `Bearer ${trialSession.apiAccessToken}` } });
  const trial = await subscription.json() as { status: string; trialStartedAt: string; trialEndsAt: string };
  expect(trial.status).toBe('TRIALING');
  expect(new Date(trial.trialEndsAt).getTime() - new Date(trial.trialStartedAt).getTime()).toBe(30 * 86400000);
  await page.getByLabel('Business address').fill('12 Rental Street, Lahore');
  await checkResponsiveWidths(page);
  await capture(page, 'onboarding-01-business-desktop.png');
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, 'onboarding-01-business-tablet.png');
  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'onboarding-01-business-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Add your first location' })).toBeVisible();
  await checkResponsiveWidths(page);
  await page.getByLabel('Pickup address').fill('12 Rental Street, Lahore');
  await capture(page, 'onboarding-02-location-desktop.png');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Add your first vehicle' })).toBeVisible();
  await checkResponsiveWidths(page);
  await page.getByLabel('Make').fill('Toyota');
  await page.getByLabel('Model').fill('Corolla');
  await page.getByLabel('Registration number').fill(`RP-${stamp}`);
  await capture(page, 'onboarding-03-vehicle-desktop.png');
  await page.getByRole('button', { name: 'Save for later' }).click();
  await expect(page).toHaveURL(/\/app\/today/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Pick up where you left off, Phase Two Rental Co.' })).toBeVisible();
  await capture(page, 'workspace-landing-incomplete-desktop.png');
  await page.getByRole('link', { name: 'Continue setup' }).click();
  await expect(page).toHaveURL(/\/dashboard\/onboarding/);
  await expect(page.getByRole('heading', { name: 'Add your first vehicle' })).toBeVisible();
  await expect(page.getByLabel('Make')).toHaveValue('Toyota');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Set your starting prices' })).toBeVisible();
  await checkResponsiveWidths(page);
  await page.getByLabel(/Daily rate/).fill('12000');
  await capture(page, 'onboarding-04-pricing-desktop.png');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Set rental basics' })).toBeVisible();
  await checkResponsiveWidths(page);
  await capture(page, 'onboarding-05-rental-basics-desktop.png');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose payment methods' })).toBeVisible();
  await checkResponsiveWidths(page);
  await capture(page, 'onboarding-06-payment-methods-desktop.png');
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, 'onboarding-tablet.png');
  await page.setViewportSize({ width: 375, height: 812 });
  await capture(page, 'onboarding-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your booking page' })).toBeVisible();
  await checkResponsiveWidths(page);
  await page.getByLabel('Your RentPay web address').fill(`phase2-rentals-${stamp}`);
  await capture(page, 'onboarding-07-booking-page-desktop.png');
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('heading', { name: 'Your rental workspace is ready.' })).toBeVisible();
  await checkResponsiveWidths(page);
  await capture(page, 'onboarding-08-complete-desktop.png');

  const headers = { authorization: `Bearer ${trialSession.apiAccessToken}` };
  const setup = await request.get(`${api}/business/onboarding`, { headers });
  const saved = await setup.json() as { business: { slug: string }; settings: { onboardingCompletedAt: string; currency: string; enabledRentalPaymentMethods: string[] }; locations: { id: string }[]; vehicle: { make: string; dailyRateMinor: number; registrationNumber: string } };
  expect(saved.settings.onboardingCompletedAt).toBeTruthy();
  expect(saved.settings.currency).toBe('PKR');
  expect(saved.settings.enabledRentalPaymentMethods).toContain('JAZZCASH');
  expect(saved.locations).toHaveLength(1);
  expect(saved.vehicle).toMatchObject({ make: 'Toyota', dailyRateMinor: 1200000, registrationNumber: `RP-${stamp}` });
  await page.goto('/app/today');
  await expect(page.getByRole('heading', { name: `Today at Phase Two Rental Co.` })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What needs attention today' })).toBeVisible();
  await expect(page.getByText('30-day free trial')).toBeVisible();
  await capture(page, 'workspace-landing-desktop.png');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const workspaceOverflow = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('body *')].map((element) => ({ element: element.tagName, classes: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) })).filter((item) => item.right > innerWidth + 1).slice(0, 10) }));
  expect(workspaceOverflow.width, `Workspace overflow: ${JSON.stringify(workspaceOverflow.elements)}`).toBeLessThanOrEqual(375);
  await capture(page, 'workspace-landing-mobile.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/rentals/${saved.business.slug}`);
  await expect(page.getByRole('heading', { name: 'Vehicles from Phase Two Rental Co' })).toBeVisible();

  const roleResponse = await request.get(`${api}/business/team/invitation-roles`, { headers });
  const roles = await roleResponse.json() as { id: string; key: string }[];
  const role = roles.find((item) => item.key === 'OPERATIONS_MANAGER')!;
  const invitedEmail = `phase2-staff-${stamp}@example.test`;
  expect((await request.post(`${api}/business/invitations`, { headers, data: { email: invitedEmail, roleId: role.id } })).status()).toBe(201);
  const inviteToken = await latestToken(request, invitedEmail, 'INVITATION');
  await page.goto(`/invite?token=${inviteToken}`);
  await capture(page, 'invitation-accept-desktop.png');
  await expect(page.getByText('Phase Two Rental Co')).toBeVisible();
  await page.getByLabel('Your name').fill('Phase Two Staff Member');
  await page.getByLabel('Create a password').fill(testPassword);
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page).toHaveURL(/\/app\/today/);

  await page.goto('/logout');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/forgot-password');
  await capture(page, 'forgot-password-desktop.png');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send instructions' }).click();
  await expect(page.getByRole('status')).toHaveText('If an account matches, reset instructions will be sent.');
  const resetToken = await latestToken(request, email, 'PASSWORD_RESET');
  const newPassword = 'RentPay-Phase2-Updated-2026!';
  await page.goto(`/reset-password?token=${resetToken}`);
  await capture(page, 'reset-password-desktop.png');
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toHaveText('Password updated. You can now sign in.');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(newPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/today/);
});

test('private and recovery surfaces are noindex and show invalid-link recovery', async ({ page, request }) => {
  for (const route of ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/invite', '/dashboard/onboarding', '/app/today', '/portal']) {
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
  await page.goto('/reset-password?token=invalid-token');
  await page.getByLabel('New password', { exact: true }).fill(testPassword);
  await page.getByLabel('Confirm new password').fill('Mismatch-Password-2026!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await page.getByLabel('Confirm new password').fill(testPassword);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toHaveText('This reset link is invalid or expired.');
  await capture(page, 'reset-password-invalid-desktop.png');
  await page.goto('/verify-email?token=invalid-token');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('status')).toContainText('invalid, expired or already used');
  await capture(page, 'verify-email-invalid-desktop.png');
  await page.goto('/invite?token=invalid-token');
  await expect(page.getByRole('status')).toContainText('invalid or has expired');
  await capture(page, 'invitation-invalid-desktop.png');
  await page.goto('/login');
  await page.getByLabel('Email').fill(`unknown-${Date.now()}@example.test`);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('We could not sign you in. Check your email and password, or verify your email first.')).toBeVisible();
  const missingEmail = `missing-${Date.now()}@example.test`;
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) statuses.push((await request.post(`${api}/auth/forgot-password`, { data: { email: missingEmail } })).status());
  expect(statuses).toContain(202);
  expect(statuses).toContain(429);
});

test('optional vehicle and pricing steps can be skipped without blocking setup', async ({ page, request }) => {
  const stamp = Date.now();
  const email = `phase2-skip-${stamp}@example.test`;
  const password = 'RentPay-Phase2-Skip-2026!';
  const registration = await request.post(`${api}/auth/register`, { data: { name: 'Optional Setup Owner', email, businessName: 'Optional Fleet Co', country: 'PK', password, termsAccepted: true } });
  expect(registration.status()).toBe(201);
  const verificationToken = await latestToken(request, email, 'EMAIL_VERIFICATION');
  expect((await request.post(`${api}/auth/verify-email`, { data: { token: verificationToken } })).status()).toBe(204);
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard\/onboarding/);
  await page.getByRole('button', { name: 'Start business setup' }).click();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByLabel('Pickup address').fill('45 Fleet Road, Karachi');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Skip this step' }).click();
  await expect(page.getByRole('heading', { name: 'Set your starting prices' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue without pricing' }).click();
  await expect(page.getByRole('heading', { name: 'Set rental basics' })).toBeVisible();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('checkbox', { name: 'Cash', exact: true }).check();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('heading', { name: 'Your rental workspace is ready.' })).toBeVisible();
  const session = await page.evaluate(async () => await (await fetch('/api/auth/session')).json() as { apiAccessToken: string });
  const response = await request.get(`${api}/business/onboarding`, { headers: { authorization: `Bearer ${session.apiAccessToken}` } });
  const setup = await response.json() as { settings: { onboardingCompletedAt: string | null; enabledRentalPaymentMethods: string[] }; locations: unknown[]; vehicle: unknown };
  expect(setup.settings.onboardingCompletedAt).toBeTruthy();
  expect(setup.settings.enabledRentalPaymentMethods).toContain('CASH');
  expect(setup.locations).toHaveLength(1);
  expect(setup.vehicle).toBeNull();
});

test('fleet workspace creates, filters, updates and safely archives a tenant vehicle', async ({ page }) => {
  const clientErrors: string[] = [];
  page.on('pageerror', (error) => clientErrors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@rentpay.local');
  await page.getByLabel('Password').fill('RentPay-Local-Only-2026!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard\/onboarding/);
  await page.goto('/app/fleet');
  await expect(page.getByRole('heading', { name: 'Fleet', exact: true })).toBeVisible();
  await page.waitForTimeout(500);

  const unique = Date.now().toString().slice(-7);
  await page.getByRole('button', { name: 'Add vehicle' }).first().click();
  const drawer = page.locator('.ant-drawer-content-wrapper');
  await expect(drawer, `Vehicle form did not open. Client errors: ${clientErrors.join('; ')}`).toBeVisible({ timeout: 5000 });
  await drawer.getByRole('textbox', { name: 'Make' }).fill('Toyota');
  await drawer.getByRole('textbox', { name: 'Model' }).fill('Corolla');
  await drawer.getByRole('textbox', { name: 'Registration number' }).fill(`E2E-${unique}`);
  await drawer.getByRole('spinbutton', { name: /Daily rate/ }).fill('18500');
  await drawer.getByRole('button', { name: 'Add vehicle' }).click();
  const vehicleRow = page.getByRole('row').filter({ hasText: `E2E-${unique}` });
  await expect(vehicleRow).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search your fleet' }).fill(`E2E-${unique}`);
  await expect(vehicleRow).toBeVisible();
  await vehicleRow.getByRole('button', { name: 'Edit Toyota Corolla' }).click();
  await expect(drawer.getByText('Update vehicle')).toBeVisible();
  await drawer.getByRole('textbox', { name: 'Model' }).fill('Corolla GLi');
  await drawer.getByRole('button', { name: 'Save changes' }).click();
  await expect(vehicleRow).toContainText('Toyota Corolla GLi');
  await vehicleRow.getByRole('button', { name: 'Archive Toyota Corolla GLi' }).click();
  await page.getByRole('button', { name: 'Archive vehicle' }).click();
  await expect(vehicleRow).toHaveCount(0);

  await page.goto('/app/locations');
  await expect(page.getByRole('heading', { name: 'Locations', exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  const locationName = `Rental Hub ${unique}`;
  await page.getByRole('button', { name: 'Add location' }).first().click();
  const locationDrawer = page.locator('.ant-drawer-content-wrapper');
  await expect(locationDrawer).toBeVisible();
  await locationDrawer.getByRole('textbox', { name: 'Location name' }).fill(locationName);
  await locationDrawer.getByRole('textbox', { name: 'Timezone' }).fill('Asia/Karachi');
  await locationDrawer.getByRole('textbox', { name: 'Pickup address' }).fill('Main Road, Lahore');
  await locationDrawer.getByRole('button', { name: 'Add location' }).click();
  const locationRow = page.getByRole('row').filter({ hasText: locationName });
  await expect(locationRow).toBeVisible();
  await locationRow.getByRole('button', { name: `Edit ${locationName}` }).click();
  await locationDrawer.getByRole('textbox', { name: 'Contact phone' }).fill('+923001234567');
  await locationDrawer.getByRole('button', { name: 'Save changes' }).click();
  await expect(locationRow).toContainText('+923001234567');
  await locationRow.getByRole('button', { name: `Archive ${locationName}` }).click();
  await page.getByRole('button', { name: 'Archive location' }).click();
  await expect(locationRow).toHaveCount(0);

  await page.goto('/app/customers');
  await expect(page.getByRole('heading', { name: 'Customers & drivers' })).toBeVisible();
  await page.waitForTimeout(500);
  const customerName = `E2E Renter ${unique}`;
  await page.getByRole('button', { name: 'Add customer' }).first().click();
  const customerDrawer = page.locator('.ant-drawer-content-wrapper');
  await expect(customerDrawer).toBeVisible();
  await customerDrawer.getByRole('textbox', { name: 'Customer name' }).fill(customerName);
  await customerDrawer.getByRole('textbox', { name: 'Phone' }).fill('+923001234567');
  await customerDrawer.getByRole('textbox', { name: 'Email' }).fill(`renter-${unique}@example.test`);
  await customerDrawer.getByRole('button', { name: 'Add customer' }).click();
  const customerRow = page.getByRole('row').filter({ hasText: customerName });
  await expect(customerRow).toBeVisible();
  await customerRow.getByRole('button', { name: customerName, exact: true }).click();
  const detailDrawer = page.locator('.ant-drawer-content-wrapper').filter({ hasText: customerName });
  await expect(detailDrawer.getByText(customerName, { exact: true })).toBeVisible();
  await detailDrawer.getByRole('button', { name: 'Add driver' }).click();
  const driverDrawer = page.locator('.ant-drawer-content-wrapper').last();
  await driverDrawer.getByRole('textbox', { name: 'Driver name' }).fill(`E2E Driver ${unique}`);
  await driverDrawer.getByRole('textbox', { name: 'Phone' }).fill('+923009876543');
  await driverDrawer.getByRole('textbox', { name: 'Licence number' }).fill(`LIC-${unique}`);
  await driverDrawer.getByRole('button', { name: 'Add driver' }).click();
  await expect(detailDrawer.getByText(`E2E Driver ${unique}`)).toBeVisible();
  await expect(detailDrawer.getByText(`LIC-${unique}`)).toBeVisible();
});
