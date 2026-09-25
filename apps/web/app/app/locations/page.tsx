import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import { LocationsWorkspace, type BusinessLocation } from './locations-workspace';
import styles from '../../../components/ui.module.css';

export const metadata = { title: 'Locations | RentPay', robots: { index: false, follow: false } };

export default async function LocationsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('settings.manage')) return <AppShell workspace="Business workspace" selectedKey="locations" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Location access</span><h1>Your role does not include location management.</h1><p>Ask your business owner to review your access if you need to manage pickup locations.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const response = await fetch(new URL('/api/business/locations', process.env.API_URL ?? 'http://localhost:4000'), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (response.status === 401) redirect('/login' as Route);
  if (!response.ok) return <AppShell workspace="Business workspace" selectedKey="locations" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Locations unavailable</span><h1>We could not load your locations.</h1><p>Your saved details are safe. Refresh this page or try again shortly.</p></div></section></PageContainer></AppShell>;
  const locations = await response.json() as BusinessLocation[];
  return <AppShell workspace="Business workspace" selectedKey="locations" navigation={navigation}><PageContainer><LocationsWorkspace initialLocations={locations} /></PageContainer></AppShell>;
}
