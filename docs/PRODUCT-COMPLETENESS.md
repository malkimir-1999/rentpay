# Product implementation audit and delivery tracker

This checklist reconciles the Phase 0 product scope, Phase 1 security architecture, Phase 2 setup implementation, and the current continued-product brief. It is deliberately a live audit: a box is checked only after the server workflow, tenant/role rules, persistence, UI, and relevant tests exist. Seed/demo data never counts as production functionality.

## Shared foundations

- [x] Modular monolith, Next.js App Router, NestJS API, PostgreSQL/Prisma workspace
- [x] Authentication, account-type boundaries, capability-based RBAC and tenant guard
- [x] Trial/onboarding, audit foundation, storage and notification abstractions
- [x] Public marketing, SEO, registration and persisted business setup
- [ ] Product-wide error/loading/empty states and permission-derived navigation audit
- [ ] Production deployment, backups/restore drill, Redis/email/private object storage configuration

## Product surfaces and domains

- [x] Marketing site and business registration/setup (Phase 2)
- [ ] Super Admin tenant/platform operations and support grants
- [ ] Business Today includes tenant-scoped live pickup, return, overdue, request, ready-for-pickup and vehicle-condition counts; payments, maintenance, damage, documents and notifications remain
- [x] Fleet inventory: tenant-scoped vehicle list/detail/create/update/archive, rates, condition, audit, and cross-tenant API tests
- [x] Location management: tenant-scoped list/read/create/update/archive, role guard, audit, cross-tenant CRUD tests, and safeguards for assigned vehicles
- [x] Customer/driver foundation: separate renter/driver records, per-tenant scoping, composite tenant/customer FK, verification states, staff notes, archive/audit, permission-gated management UI, and cross-tenant API tests
- [ ] Fleet history, managed images/documents, service/reminder links, and derived operational availability
- [ ] Availability calendar/timeline (date-window search is implemented; reservation conflicts are checked transactionally under a vehicle row lock)
- [ ] Customer and driver documents, rental/payment history, customer-portal linking and verification evidence
- [x] Staff reservation requests, approval/ready/cancel/decline/no-show transitions, vehicle assignment, scoped availability, audit, and transactional rental conversion are implemented; public requests, expiry automation, extras, and driver assignment remain
- [ ] Rental lifecycle: reservation conversion, deposit-gated checkout, active rental, extension and return are implemented; verification, inspection, agreement, settlement and close remain
- [ ] Tenant-scoped immutable rental payment receipt/refund entries and separate deposit collection/refund/retention ledger are implemented for reservations; rental allocation, receipts, and rental-level settlement remain
- [ ] Maintenance, damage cases, inspections, and evidence documents
- [ ] Invoices/agreements and secure downloadable assets
- [ ] Team lifecycle and permission-aware operational navigation
- [ ] Operational settings beyond locations
- [ ] Notification center and delivery workflows
- [ ] Global search and essential reports/utilization
- [x] Hosted business landing page foundation
- [ ] Public vehicle catalogue, availability quote, request-to-book and customer status flow
- [ ] Structured website builder, starter themes, pages/sections/reorder/preview/publish
- [ ] Customer portal for bookings, active rentals, documents, payments and extension requests
- [ ] SaaS plan management, manual local subscription payments and platform verification UI

## Critical release gates

- [ ] Cross-tenant CRUD/list/guessed-ID tests for every tenant-owned aggregate (fleet, locations, customers and drivers are covered; remaining aggregates need their own tests)
- [x] Double-booking prevention under concurrent requests (Playwright concurrency test: exactly one of two overlapping creates succeeds)
- [ ] Role-by-role access tests for platform, owner, operations, finance, fleet, read-only, customer, guest
- [ ] Critical booking → checkout → return → settlement journey on mobile and desktop
- [ ] No dead controls/routes, fake business numbers, or production mock data
- [ ] Full typecheck, lint, Vitest, integration/E2E, Prisma, and web/API production builds
- [ ] Final documentation reflects only implemented workflows and explicit provider/legal configuration needs

## Implementation sequence

Deliver vertical slices in dependency order: fleet/location data; customers/drivers; reservations and availability; payment/deposit ledger; inspections and documents; rental checkout/return/settlement; Today, notifications and reports; public booking/customer portal; website builder; platform operations and release hardening. Do not mark this product complete until all approved P0 criteria in the source blueprint pass.
