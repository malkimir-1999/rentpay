import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { FleetWorkspace, type FleetVehicle } from './fleet-workspace';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';

export const metadata = { title: 'Fleet | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function FleetPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  if (!session.user.permissions?.includes('vehicle.view')) {
    return <AppShell workspace="Business workspace" selectedKey="fleet" navigation={[{ key: 'today', label: 'Today', href: '/app/today' }]}><PageContainer>
      <section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Fleet access</span><h1>Your role does not include fleet access.</h1><p>Ask your business owner to grant the vehicle viewing permission if you need this workspace.</p></div></section>
    </PageContainer></AppShell>;
  }
  if (!session.apiAccessToken) redirect('/login' as Route);
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const [vehiclesResponse, locationsResponse] = await Promise.all([
    fetch(new URL('/api/business/fleet', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/fleet/options', apiOrigin), { headers, cache: 'no-store' }),
  ]);
  if (vehiclesResponse.status === 401 || locationsResponse.status === 401) redirect('/login' as Route);
  if (!vehiclesResponse.ok || !locationsResponse.ok) {
    return <AppShell workspace="Business workspace" selectedKey="fleet" navigation={[{ key: 'today', label: 'Today', href: '/app/today' }]}><PageContainer>
      <section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Fleet unavailable</span><h1>We could not load your vehicles.</h1><p>Your saved data is safe. Refresh this page or try again in a moment.</p></div></section>
    </PageContainer></AppShell>;
  }
  const [vehicles, options] = await Promise.all([
    vehiclesResponse.json() as Promise<FleetVehicle[]>,
    locationsResponse.json() as Promise<{ locations: { id: string; name: string }[]; currency: string }>,
  ]);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  return <AppShell workspace="Business workspace" selectedKey="fleet" navigation={navigation}>
    <PageContainer><FleetWorkspace initialVehicles={vehicles} locations={options.locations} currency={options.currency} canManage={permissions.includes('vehicle.manage')} /></PageContainer>
  </AppShell>;
}
