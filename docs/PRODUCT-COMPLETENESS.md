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
- [ ] Business Today includes tenant-scoped live pickup, return, overdue, request, ready-for-pickup, vehicle-condition, unresolved-damage and maintenance-due/in-progress counts; payments, document and notification alerts remain
- [x] Fleet inventory: tenant-scoped vehicle list/detail/create/update/archive, rates, condition, audit, and cross-tenant API tests
- [x] Location management: tenant-scoped list/read/create/update/archive, role guard, audit, cross-tenant CRUD tests, and safeguards for assigned vehicles
- [x] Customer/driver foundation: separate renter/driver records, per-tenant scoping, composite tenant/customer FK, verification states, staff notes, archive/audit, permission-gated management UI, and cross-tenant API tests
- [ ] Fleet history, managed images/documents, service/reminder links, and derived operational availability
- [ ] Availability calendar/timeline (date-window search is implemented; reservation conflicts are checked transactionally under a vehicle row lock)
- [ ] Customer and driver documents, rental/payment history, customer-portal linking and verification evidence
- [x] Staff reservation requests, approval/ready/cancel/decline/no-show transitions, vehicle assignment, scoped availability, audit, and transactional rental conversion are implemented; public requests, expiry automation, extras, and driver assignment remain
- [ ] Rental lifecycle: reservation conversion, verified-renter and deposit-gated checkout, extension, inspection-gated return, tenant-scoped settlement, ledgered final payment/deposit application/refund, and close are implemented; rental agreement and customer signature remain
- [x] Tenant-scoped immutable rental payment receipt/refund entries and separate deposit collection/refund/retention ledger support rental settlement; settlement requires returned state, resolved damage, balanced payment/deposit amounts, closes once, and is audited
- [ ] Inspections now persist tenant-scoped handover/return checklists and secure file references; flagged areas create audited damage cases, and resolving a case requires an explanation. Maintenance work orders, due-date/mileage alerts, service windows, booking blocks and audited transitions are implemented; formal release inspection, evidence previews/download authorization, billing linkage, and return comparison remain
- [ ] Invoices/agreements and secure downloadable assets
- [ ] Team lifecycle and permission-aware operational navigation
- [ ] Operational settings beyond locations
- [ ] Notification center and delivery workflows
- [ ] Global search and essential reports/utilization
- [x] Hosted business landing page foundation
- [ ] Public vehicle catalogue and rate display, date-based live availability, rate-limited guest request-to-book with atomic tenant-scoped customer/reservation creation and audit are implemented; customer status tracking and request expiry automation remain
- [ ] Structured website builder, starter themes, pages/sections/reorder/preview/publish
- [ ] Customer portal for bookings, active rentals, documents, payments and extension requests
- [ ] SaaS plan management, manual local subscription payments and platform verification UI

## Critical release gates

- [ ] Cross-tenant CRUD/list/guessed-ID tests for every tenant-owned aggregate (fleet, locations, customers and drivers are covered; remaining aggregates need their own tests)
- [x] Double-booking prevention under concurrent requests (Playwright concurrency test: exactly one of two overlapping creates succeeds)
- [ ] Role-by-role access tests for platform, owner, operations, finance, fleet, read-only, customer, guest
- [ ] Critical public request → staff approval → checkout → return → settlement journey on mobile and desktop (public booking and rental lifecycle API E2E coverage exists; cross-surface responsive journey coverage remains)
- [ ] No dead controls/routes, fake business numbers, or production mock data
- [ ] Full typecheck, lint, Vitest, integration/E2E, Prisma, and web/API production builds
- [ ] Final documentation reflects only implemented workflows and explicit provider/legal configuration needs

## Implementation sequence

Deliver vertical slices in dependency order: fleet/location data; customers/drivers; reservations and availability; payment/deposit ledger; inspections and documents; rental checkout/return/settlement; Today, notifications and reports; public booking/customer portal; website builder; platform operations and release hardening. Do not mark this product complete until all approved P0 criteria in the source blueprint pass.
