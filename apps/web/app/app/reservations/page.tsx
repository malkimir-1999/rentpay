import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { ReservationsWorkspace, type ReservationRow, type ReservationCustomer, type ReservationLocation } from './workspace';

export const metadata = { title: 'Reservations | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function ReservationsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('reservation.view')) return <AppShell workspace="Business workspace" selectedKey="reservations" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Reservation access</span><h1>Your role does not include reservations.</h1><p>Ask your business owner to grant reservation access if you need to manage booking requests.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const [reservationResponse, customerResponse, locationResponse] = await Promise.all([
    fetch(new URL('/api/business/reservations', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/customers', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/locations', apiOrigin), { headers, cache: 'no-store' }),
  ]);
  if ([reservationResponse, customerResponse, locationResponse].some((response) => response.status === 401)) redirect('/login' as Route);
  if ([reservationResponse, customerResponse, locationResponse].some((response) => !response.ok)) return <AppShell workspace="Business workspace" selectedKey="reservations" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Reservations unavailable</span><h1>We could not load the reservation workspace.</h1><p>Your saved data is safe. Refresh this page or try again shortly.</p></div></section></PageContainer></AppShell>;
  const [reservations, customers, locations] = await Promise.all([
    reservationResponse.json() as Promise<ReservationRow[]>,
    customerResponse.json() as Promise<ReservationCustomer[]>,
    locationResponse.json() as Promise<ReservationLocation[]>,
  ]);
  return <AppShell workspace="Business workspace" selectedKey="reservations" navigation={navigation}><PageContainer><ReservationsWorkspace initialReservations={reservations} customers={customers} locations={locations} canManage={permissions.includes('reservation.manage')} canConvertRental={permissions.includes('rental.manage')} canViewPayments={permissions.includes('payment.view')} canRecordPayments={permissions.includes('payment.manage')} canManageDeposits={permissions.includes('deposit.manage')} /></PageContainer></AppShell>;
}
