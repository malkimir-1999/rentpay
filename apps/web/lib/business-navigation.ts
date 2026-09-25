import type { Route } from 'next';

const items: Array<{ key: string; label: string; href: Route; permission?: string }> = [
  { key: 'today', label: 'Today', href: '/app/today' },
  { key: 'reservations', label: 'Reservations', href: '/app/reservations', permission: 'reservation.view' },
  { key: 'rentals', label: 'Rentals', href: '/app/rentals' as Route, permission: 'rental.view' },
  { key: 'availability', label: 'Availability', href: '/app/availability', permission: 'vehicle.view' },
  { key: 'fleet', label: 'Fleet', href: '/app/fleet', permission: 'vehicle.view' },
  { key: 'customers', label: 'Customers & drivers', href: '/app/customers', permission: 'customer.view' },
  { key: 'locations', label: 'Locations', href: '/app/locations', permission: 'settings.manage' },
  { key: 'setup', label: 'Business setup', href: '/dashboard/onboarding', permission: 'settings.manage' },
];

export function businessNavigation(permissions: readonly string[]) {
  return items.filter((item) => !item.permission || permissions.includes(item.permission));
}
