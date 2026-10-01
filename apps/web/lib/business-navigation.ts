import type { Route } from 'next';

const items: Array<{ key: string; label: string; href: Route; permission?: string }> = [
  { key: 'today', label: 'Today', href: '/app/today' },
  { key: 'reports', label: 'Reports', href: '/app/reports' as Route, permission: 'report.view' },
  { key: 'notifications', label: 'Notifications', href: '/app/notifications' as Route },
  { key: 'reservations', label: 'Reservations', href: '/app/reservations', permission: 'reservation.view' },
  { key: 'rentals', label: 'Rentals', href: '/app/rentals' as Route, permission: 'rental.view' },
  { key: 'fleet', label: 'Fleet', href: '/app/fleet', permission: 'vehicle.view' },
  { key: 'availability', label: 'Availability', href: '/app/availability', permission: 'vehicle.view' },
  { key: 'customers', label: 'Customers & drivers', href: '/app/customers', permission: 'customer.view' },
  { key: 'inspections', label: 'Inspections & damage', href: '/app/inspections' as Route, permission: 'inspection.manage' },
  { key: 'maintenance', label: 'Maintenance', href: '/app/maintenance' as Route, permission: 'maintenance.view' },
  { key: 'team', label: 'Team', href: '/app/team' as Route, permission: 'team.manage' },
  { key: 'locations', label: 'Locations', href: '/app/locations', permission: 'settings.manage' },
  { key: 'setup', label: 'Business setup', href: '/dashboard/onboarding', permission: 'settings.manage' },
];

export function businessNavigation(permissions: readonly string[]) {
  return items.filter((item) => !item.permission || permissions.includes(item.permission));
}
