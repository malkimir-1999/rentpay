import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { AvailabilityWorkspace, type AvailabilityLocation } from './workspace';

export const metadata = { title: 'Availability | RentPay', robots: { index: false, follow: false } };
export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('vehicle.view')) return <AppShell workspace="Business workspace" selectedKey="availability" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Availability access</span><h1>Your role does not include vehicle availability.</h1><p>Ask your business owner to grant fleet viewing permission if you need to check the schedule.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const response = await fetch(new URL('/api/business/locations', process.env.API_URL ?? 'http://localhost:4000'), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (response.status === 401) redirect('/login' as Route);
  if (!response.ok) return <AppShell workspace="Business workspace" selectedKey="availability" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Schedule unavailable</span><h1>We could not load your locations.</h1><p>Your records are safe. Refresh this page or try again shortly.</p></div></section></PageContainer></AppShell>;
  const locations = await response.json() as AvailabilityLocation[];
  return <AppShell workspace="Business workspace" selectedKey="availability" navigation={navigation}><PageContainer><AvailabilityWorkspace locations={locations} canCreateReservation={permissions.includes('reservation.manage')} /></PageContainer></AppShell>;
}
