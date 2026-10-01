import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { RentalsWorkspace, type RentalRow, type RentalLocation } from './workspace';
import type { ExtensionRequestRow } from './extension-requests';

export const metadata = { title: 'Rentals | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function RentalsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('rental.view')) return <AppShell workspace="Business workspace" selectedKey="rentals" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Rental access</span><h1>Your role does not include rentals.</h1><p>Ask your business owner to review your team permissions if you need to manage handovers or returns.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const canReturn = permissions.includes('rental.return');
  const canExtend = permissions.includes('rental.manage');
  const [rentalResponse, locationsResponse, extensionResponse] = await Promise.all([
    fetch(new URL('/api/business/rentals', apiOrigin), { headers, cache: 'no-store' }),
    canReturn ? fetch(new URL('/api/business/rentals/return-locations', apiOrigin), { headers, cache: 'no-store' }) : Promise.resolve(null),
    canExtend ? fetch(new URL('/api/business/rentals/extension-requests', apiOrigin), { headers, cache: 'no-store' }) : Promise.resolve(null),
  ]);
  if (rentalResponse.status === 401 || locationsResponse?.status === 401 || extensionResponse?.status === 401) redirect('/login' as Route);
  if (!rentalResponse.ok || (locationsResponse && !locationsResponse.ok) || (extensionResponse && !extensionResponse.ok)) return <AppShell workspace="Business workspace" selectedKey="rentals" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Rentals unavailable</span><h1>We could not load rental operations.</h1><p>Your saved records are safe. Refresh this page or try again shortly.</p></div></section></PageContainer></AppShell>;
  const rentals = await rentalResponse.json() as RentalRow[];
  const locations = locationsResponse ? await locationsResponse.json() as RentalLocation[] : [];
  const extensionRequests = extensionResponse ? await extensionResponse.json() as ExtensionRequestRow[] : [];
  return <AppShell workspace="Business workspace" selectedKey="rentals" navigation={navigation}><PageContainer><RentalsWorkspace initialRentals={rentals} initialExtensionRequests={extensionRequests} locations={locations} canCheckout={permissions.includes('rental.checkout')} canReturn={canReturn} canExtend={canExtend} canInspect={permissions.includes('inspection.manage')} canSettle={canExtend && permissions.includes('payment.manage') && permissions.includes('deposit.manage')} /></PageContainer></AppShell>;
}
