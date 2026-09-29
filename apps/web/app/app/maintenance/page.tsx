import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { MaintenanceWorkspace } from './workspace';

export const metadata = { title: 'Maintenance | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS' || !session.apiAccessToken) redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('maintenance.view')) return <AppShell workspace="Business workspace" selectedKey="maintenance" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Maintenance access</span><h1>Your role cannot view maintenance.</h1><p>Ask your business owner for maintenance access.</p></div></section></PageContainer></AppShell>;
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const [workResponse, fleetResponse] = await Promise.all([
    fetch(new URL('/api/business/maintenance', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/fleet', apiOrigin), { headers, cache: 'no-store' }),
  ]);
  if (workResponse.status === 401 || fleetResponse.status === 401) redirect('/login' as Route);
  if (!workResponse.ok || !fleetResponse.ok) return <AppShell workspace="Business workspace" selectedKey="maintenance" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Service unavailable</span><h1>We could not load maintenance.</h1><p>Your saved work orders are safe. Refresh and try again.</p></div></section></PageContainer></AppShell>;
  const [orders, vehicles] = await Promise.all([workResponse.json(), fleetResponse.json()]);
  return <AppShell workspace="Business workspace" selectedKey="maintenance" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Vehicle upkeep</span><h1>Maintenance</h1><p>Plan service, keep vehicles out of conflicting bookings and track work through completion.</p></div></section><MaintenanceWorkspace initialOrders={orders} vehicles={vehicles} canManage={permissions.includes('maintenance.manage')} canInspect={permissions.includes('inspection.manage')} /></PageContainer></AppShell>;
}
