import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { InspectionsWorkspace } from './workspace';

export const metadata = { title: 'Inspections & damage | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function InspectionsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('inspection.manage')) return <AppShell workspace="Business workspace" selectedKey="inspections" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Inspection access</span><h1>Your role does not include inspections.</h1><p>Ask your business owner to grant inspection management access if you need to record vehicle condition or damage.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const [vehicleResponse, inspectionResponse, damageResponse] = await Promise.all([
    fetch(new URL('/api/business/fleet', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/inspections', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/inspections/damage-cases', apiOrigin), { headers, cache: 'no-store' }),
  ]);
  if ([vehicleResponse.status, inspectionResponse.status, damageResponse.status].includes(401)) redirect('/login' as Route);
  if (!vehicleResponse.ok || !inspectionResponse.ok || !damageResponse.ok) return <AppShell workspace="Business workspace" selectedKey="inspections" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Inspections unavailable</span><h1>We could not load vehicle checks.</h1><p>Your saved records are safe. Refresh this page and try again.</p></div></section></PageContainer></AppShell>;
  const [vehicles, inspections, damageCases] = await Promise.all([vehicleResponse.json(), inspectionResponse.json(), damageResponse.json()]);
  return <AppShell workspace="Business workspace" selectedKey="inspections" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Vehicle condition</span><h1>Inspections and damage</h1><p>Record condition before handover or return, attach evidence and keep repair issues visible to your team.</p></div></section><InspectionsWorkspace vehicles={vehicles} initialInspections={inspections} initialDamageCases={damageCases} canUpload={permissions.includes('vehicle.manage')} /></PageContainer></AppShell>;
}
