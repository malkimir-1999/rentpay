import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { MoneyDisplay } from '../../components/ui';
import { ExtensionRequests } from './extension-requests';
import { CustomerNotices } from './customer-notices';
import { CustomerPaymentHistory } from './payment-history';
import styles from './portal.module.css';

export const metadata = { title: 'Your rentals | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

type Business = { name: string; slug: string; phone: string | null; email: string | null; settings: { timezone: string } | null };
type Booking = { id: string; status: string; source: string; startAt: string; endAt: string; estimatedTotalMinor: number; currency: string; business: Business; vehicle: { make: string; model: string; category: string | null }; pickupLocation: { name: string; address: string | null }; dropoffLocation: { name: string } | null };
type Rental = { id: string; status: string; startAt: string; expectedReturnAt: string; actualReturnAt: string | null; estimatedTotalMinor: number; currency: string; business: Business; vehicle: { make: string; model: string; category: string | null }; pickupLocation: { name: string }; dropoffLocation: { name: string } | null };
type ExtensionRequest = { id: string; requestedReturnAt: string; reason: string; status: string; decisionNote: string | null; rental: { vehicle: { make: string; model: string }; business: { name: string } } };
type Notice = { id: string; title: string | null; message: string | null; readAt: string | null; createdAt: string };
type CustomerTransaction = { id: string; kind: 'PAYMENT' | 'DEPOSIT'; type: string; amountMinor: number; currency: string; method: string | null; createdAt: string; vehicle: { make: string; model: string }; business: { name: string } };

function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

function contactLinks(business: Business) {
  return <span className={styles.contact}>{business.email && <a href={`mailto:${business.email}`}>Email {business.name}</a>}{business.phone && <a href={`tel:${business.phone}`}>Call {business.name}</a>}</span>;
}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'CUSTOMER' || !session.apiAccessToken) redirect('/portal/login' as Route);
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const [profileResponse, bookingResponse, rentalResponse, extensionResponse, noticesResponse, paymentsResponse] = await Promise.all([
    fetch(new URL('/api/customer/me', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/customer/bookings', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/customer/rentals', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/customer/extension-requests', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/customer/notifications', apiOrigin), { headers, cache: 'no-store' }),
    fetch(new URL('/api/customer/payments', apiOrigin), { headers, cache: 'no-store' }),
  ]);
  if ([profileResponse, bookingResponse, rentalResponse, extensionResponse, noticesResponse, paymentsResponse].some((response) => response.status === 401 || response.status === 403)) redirect('/portal/login' as Route);
  if ([profileResponse, bookingResponse, rentalResponse, extensionResponse, noticesResponse, paymentsResponse].some((response) => !response.ok)) return <main className={styles.page}><section className={styles.container}><Link className={styles.brand} href="/">RentPay</Link><h1>We could not load your rentals</h1><p>Your information is safe. Refresh this page to try again.</p></section></main>;
  const [profile, bookings, rentals, extensionRequests, notices, transactions] = await Promise.all([profileResponse.json(), bookingResponse.json(), rentalResponse.json(), extensionResponse.json(), noticesResponse.json(), paymentsResponse.json()]) as [{ name: string | null; email: string }, Booking[], Rental[], ExtensionRequest[], Notice[], CustomerTransaction[]];
  const upcoming = bookings.filter((booking) => new Date(booking.endAt).getTime() >= Date.now() && !['CANCELLED', 'DECLINED', 'EXPIRED', 'NO_SHOW'].includes(booking.status));
  const activeRentals = rentals.filter((rental) => rental.status === 'ACTIVE');
  const extendableRentals = rentals.filter((rental) => ['ACTIVE', 'BOOKED'].includes(rental.status));
  const pastRentals = rentals.filter((rental) => rental.status !== 'ACTIVE');

  return <main className={styles.page}>
    <header className={styles.header}><Link className={styles.brand} href="/">RentPay</Link><div className={styles.account}><span>{profile.name || profile.email}</span><Link href="/logout">Sign out</Link></div></header>
    <div className={styles.container}>
      <section className={styles.hero}><span className={styles.eyebrow}>Customer portal</span><h1>Your rentals, in one place.</h1><p>See booking updates, rental dates and who to contact if you need help.</p></section>
      <CustomerNotices initialNotices={notices} />
      <ExtensionRequests rentals={extendableRentals} initialRequests={extensionRequests} />
      <CustomerPaymentHistory transactions={transactions} />
      <section className={styles.section} aria-labelledby="active-title"><div className={styles.sectionHeading}><div><h2 id="active-title">Active rentals</h2><p>Vehicles currently checked out to you.</p></div><span className={styles.count}>{activeRentals.length}</span></div>
        {activeRentals.length ? <div className={styles.cards}>{activeRentals.map((rental) => { const timezone = rental.business.settings?.timezone ?? 'Asia/Karachi'; return <article className={styles.card} key={rental.id}><div className={styles.cardHeading}><div><strong>{rental.vehicle.make} {rental.vehicle.model}</strong><span>{rental.business.name} · {rental.vehicle.category ?? 'Rental vehicle'}</span></div><span className={styles.active}>Active</span></div><dl><div><dt>Pickup</dt><dd>{dateTime(rental.startAt, timezone)} · {rental.pickupLocation.name}</dd></div><div><dt>Return due</dt><dd>{dateTime(rental.expectedReturnAt, timezone)} · {rental.dropoffLocation?.name ?? 'Confirm with the business'}</dd></div><div><dt>Rental total</dt><dd><MoneyDisplay amountMinor={rental.estimatedTotalMinor} currency={rental.currency} /></dd></div></dl>{contactLinks(rental.business)}</article>; })}</div> : <div className={styles.empty}><strong>No active rentals right now</strong><p>When a business checks out a vehicle to you, its dates and return details will appear here.</p></div>}
      </section>
      <section className={styles.section} aria-labelledby="upcoming-title"><div className={styles.sectionHeading}><div><h2 id="upcoming-title">Upcoming bookings</h2><p>Requests and reservations that have not ended yet.</p></div><span className={styles.count}>{upcoming.length}</span></div>
        {upcoming.length ? <div className={styles.cards}>{upcoming.map((booking) => { const timezone = booking.business.settings?.timezone ?? 'Asia/Karachi'; return <article className={styles.card} key={booking.id}><div className={styles.cardHeading}><div><strong>{booking.vehicle.make} {booking.vehicle.model}</strong><span>{booking.business.name} · {booking.vehicle.category ?? 'Rental vehicle'}</span></div><span className={styles.status}>{booking.status.replaceAll('_', ' ')}</span></div><dl><div><dt>Pickup</dt><dd>{dateTime(booking.startAt, timezone)} · {booking.pickupLocation.name}</dd></div><div><dt>Return</dt><dd>{dateTime(booking.endAt, timezone)} · {booking.dropoffLocation?.name ?? 'Same location'}</dd></div><div><dt>Estimated total</dt><dd><MoneyDisplay amountMinor={booking.estimatedTotalMinor} currency={booking.currency} /></dd></div></dl>{contactLinks(booking.business)}</article>; })}</div> : <div className={styles.empty}><strong>No upcoming bookings yet</strong><p>After a rental business confirms a booking with your verified email, you’ll see its status and trip details here.</p></div>}
      </section>
      <section className={styles.section} aria-labelledby="history-title"><div className={styles.sectionHeading}><div><h2 id="history-title">Past rentals</h2><p>Your recent completed or closed rental records.</p></div><span className={styles.count}>{pastRentals.length}</span></div>
        {pastRentals.length ? <div className={styles.cards}>{pastRentals.map((rental) => { const timezone = rental.business.settings?.timezone ?? 'Asia/Karachi'; return <article className={styles.card} key={rental.id}><div className={styles.cardHeading}><div><strong>{rental.vehicle.make} {rental.vehicle.model}</strong><span>{rental.business.name}</span></div><span className={styles.status}>{rental.status.replaceAll('_', ' ')}</span></div><dl><div><dt>Rental dates</dt><dd>{dateTime(rental.startAt, timezone)} – {dateTime(rental.actualReturnAt ?? rental.expectedReturnAt, timezone)}</dd></div><div><dt>Total</dt><dd><MoneyDisplay amountMinor={rental.estimatedTotalMinor} currency={rental.currency} /></dd></div></dl>{contactLinks(rental.business)}</article>; })}</div> : <div className={styles.empty}><strong>Your rental history will appear here</strong><p>Completed rentals are kept here so you can check dates and contact the rental business.</p></div>}
      </section>
    </div>
  </main>;
}
