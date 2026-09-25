# Role-based access control

Authorization is expressed as centralized capabilities, not role-name checks in feature code. A business membership references one role; `RolePermission` maps roles to central permission definitions. `TenantAccessGuard` loads current membership and permission grants from persistence on each request, so revoked membership/grants take effect without trusting stale client claims. The `RequirePermissions` decorator and permission guard enforce capabilities server-side.

Built-in tenant roles are seeded for development: OWNER, ADMIN, MANAGER, and STAFF. Owner/admin receive team/settings capabilities; operating capabilities are assigned according to the role map in `apps/api/src/modules/identity/permissions.ts`. API tests verify allow and deny cases. Platform authorization uses a distinct account type and `platformRole`; the Super Admin guard never treats tenant roles as platform access. Customer routes similarly require the CUSTOMER account context.

To introduce a permission, add its stable string to the central permission catalog, map it to default roles/seed behavior, guard the API endpoint, and test both grant and denial. Hiding a button in the UI is not authorization.
