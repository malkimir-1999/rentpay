export const permissions = ['dashboard.view','reservation.view','reservation.manage','rental.view','rental.checkout','rental.return','rental.manage','vehicle.view','vehicle.manage','customer.view','customer.manage','payment.view','payment.manage','deposit.manage','inspection.manage','maintenance.view','maintenance.manage','report.view','report.export','team.manage','settings.manage','audit.view'] as const;
export type PermissionKey = typeof permissions[number];
export function hasPermission(granted: readonly string[], required: PermissionKey) { return granted.includes(required); }
