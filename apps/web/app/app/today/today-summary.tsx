import Link from 'next/link';
import type { Route } from 'next';
import styles from '../../../components/ui.module.css';

export type TodayData = {
  timezone: string;
  pickups: number;
  returns: number;
  overdue: number;
  bookingRequests: number;
  readyForPickup: number;
  availableVehicles: number;
  preparingVehicles: number;
  unresolvedDamage: number | null;
};

export function TodaySummary({ data, permissions }: { data: TodayData; permissions: readonly string[] }) {
  const items = [
    { label: 'Pickups today', value: data.pickups, detail: 'Booked rentals scheduled for handover.', href: '/app/rentals', permission: 'rental.view' },
    { label: 'Returns today', value: data.returns, detail: 'Active rentals due back today.', href: '/app/rentals', permission: 'rental.view' },
    { label: 'Overdue rentals', value: data.overdue, detail: 'Active rentals past their expected return.', href: '/app/rentals', permission: 'rental.view' },
    { label: 'Booking requests', value: data.bookingRequests, detail: 'Requests waiting for a decision.', href: '/app/reservations', permission: 'reservation.view' },
    { label: 'Ready for pickup', value: data.readyForPickup, detail: 'Reservations ready to turn into rentals.', href: '/app/reservations', permission: 'reservation.view' },
    { label: 'Vehicles ready', value: data.availableVehicles, detail: `${data.preparingVehicles} vehicle${data.preparingVehicles === 1 ? '' : 's'} in preparation. Ready vehicles may still have bookings.`, href: '/app/fleet', permission: 'vehicle.view' },
    ...(data.unresolvedDamage === null ? [] : [{ label: 'Damage cases', value: data.unresolvedDamage, detail: 'Open issues that need repair review or a final decision.', href: '/app/inspections', permission: 'inspection.manage' }]),
  ];
  return <section className={styles.section} aria-labelledby="today-heading">
    <div className={styles.sectionHeader}><div><h2 id="today-heading">What needs attention today</h2><p>Times follow your business timezone: {data.timezone}.</p></div></div>
    <div className={styles.workspaceCards}>{items.map((item) => <article className={styles.workspaceCard} key={item.label}>
      <span>{item.label}</span><strong>{item.value}</strong><p>{item.detail}</p>
      {permissions.includes(item.permission) && <Link href={item.href as Route}>Open {item.label.toLowerCase()}</Link>}
    </article>)}</div>
  </section>;
}
