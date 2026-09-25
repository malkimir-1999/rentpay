# RentPay — Phase 0 Product & Technical Blueprint

**Status:** Architecture and product definition only. No application code, components, migrations, or implementation are included.

## 1. Executive Product Summary

RentPay is a multi-tenant Rental Business Operating System for small and medium car-rental companies. V1 will connect the complete operational loop: reservation, verification, vehicle assignment, payment/deposit, checkout, active rental, return, settlement, and vehicle re-preparation. It is not a generic dashboard or simple vehicle CRUD system.

The product has four operational surfaces: SaaS marketing and onboarding, platform administration, the rental-business workspace, and customer-facing booking/portal experiences. Tenant isolation, operational correctness, auditability, and a focused mobile-friendly handover/return experience are non-negotiable.

## 2. Product Vision

Give independent rental businesses one reliable place to know what is happening today, prevent vehicle conflicts, complete rentals correctly, collect money, document condition, and make decisions from trustworthy operational data.

## 3. Target Customer Profile

Primary: owner-led or manager-led rental businesses with roughly 5–150 vehicles, one or several locations, and staff who currently rely on spreadsheets, messaging apps, paper agreements, and disconnected payment records. V1 should optimize for one to five locations without making a small operator configure an enterprise system.

Secondary: growing regional operators needing roles, auditability, utilization reporting, and public booking. Large franchise, peer-to-peer marketplaces, complex revenue management, and country-specific tax automation are later segments.

## 4. Primary Problems We Solve

- Double-booked or incorrectly assigned vehicles.
- No dependable view of today's pickups, returns, overdue rentals, and preparation work.
- Missed balances, deposits, extensions, and additional charges.
- Weak customer/driver verification and fragmented records.
- Disputes caused by poor pre/post-rental condition evidence.
- Vehicles unavailable because cleaning, damage, or maintenance status is invisible.
- Owners lack reliable utilization, revenue, and outstanding-payment visibility.

## 5. Product Value Proposition

RentPay helps rental teams run every rental from one operational timeline, with availability protected by server-side rules and every important financial, vehicle, and authorization change traceable. Customers receive a clear, lightweight booking and document experience without being exposed to the internal complexity of the business workspace.

## 6. SaaS Architecture Overview

Use a modular monolith for V1: a Next.js web application plus a separately deployable Node.js API, shared TypeScript contracts, PostgreSQL, object storage, a job worker, and an email provider. Keep domain modules separated in code and data access, but avoid microservices until scale or team boundaries justify them.

Tenant context flows from authenticated business membership or a deliberately scoped public booking context into every service and repository operation. Platform administration is a separate authorization boundary. Public booking never receives unrestricted tenant identifiers or internal records.

## 7. Complete User Types

**Platform:** Super Admin, Platform Support (restricted and audited).

**Business:** Owner, Business Admin, Manager, Reservation Staff, Operations Staff, Finance Staff, Fleet Staff.

**Customer:** Primary renter, additional driver, booking-only guest.

Do not expose all roles in onboarding. Assign a small default role set and allow custom permissions later.

## 8. Recommended V1 RBAC Model

Use capability-based permissions, scoped to a tenant and optionally a location. V1 roles: Owner, Admin, Operations Manager, Front Desk/Reservations, Finance, Fleet, and Read-only. A user may have one or more role assignments.

Core permission groups: dashboard.view, reservation.view/manage, rental.view/checkout/return/manage, vehicle.view/manage, inspection.manage, maintenance.view/manage, customer.view/manage, payment.view/manage, deposit.manage, report.view/export, team.manage, settings.manage, audit.view. Owner retains billing, ownership, and destructive administrative authority. Platform Support has no implicit tenant access; support access requires an expiring, reason-coded, audited grant.

## 9. Complete Product Surfaces

1. Marketing website and SaaS registration.
2. Super Admin console.
3. Rental Business workspace.
4. Public rental-business booking site.
5. Lightweight customer portal.
6. Transactional email and future messaging channels.

## 10. Complete Module Architecture

Business modules: Today/Operations, Reservations, Rentals, Fleet, Availability, Customers and Drivers, Locations, Payments, Deposits, Checkout/Return, Inspections and Damage, Maintenance, Documents, Invoices/Receipts, Reports, Notifications, Team/Roles, Business Settings, and Audit Activity.

For V1, combine related navigation where useful: Inspections/Damage, Payments/Deposits, and Team/Roles. Keep Reservation and Rental as separate domains even when their screens link together.

## 11. Marketing Website Information Architecture

Home; Product; How It Works; Features; Solutions by business size; Pricing; Resources/FAQ; Contact/Demo; Sign in; Start trial; legal pages (privacy, terms, acceptable use). Public pages should be server-rendered, indexable, fast, and written around operational outcomes rather than generic SaaS claims.

## 12. Super Admin Information Architecture

Overview; Businesses/Tenants; Tenant detail; Users; Plans; Trial and subscription approvals; Manual payment verification; Platform notifications; Support access requests; Platform audit log; operational metrics; feature flags; platform settings. Tenant impersonation is not a normal navigation feature: use explicit time-limited access sessions with reason, approval policy, banner, and full audit trail.

## 13. Rental Business Dashboard Information Architecture

Today; Reservations; Rentals; Fleet; Availability calendar; Customers/Drivers; Payments and Deposits; Inspections/Damage; Maintenance; Documents; Reports; Team and Roles; Locations; Business Settings; Activity Log; Help. Today is the landing page and is action-oriented, not chart-oriented.

## 14. Customer Portal Information Architecture

Sign in/secure link; My Bookings; Booking detail; Active Rental; Documents; Payments/Receipts; Extension request; Profile and drivers; Support/contact. No access to internal notes, margins, other customers, fleet-wide availability, or staff activity.

## 15. Public Rental Website / Booking Architecture

Business landing/booking page; vehicle list; vehicle detail; date/location selector; extras; customer and driver details; document upload if required; review and payment instruction; confirmation/status page. V1 should support **Request to Book** first: it prevents unverified instant commitments and is safer while pricing, availability, deposits, and local payment confirmation mature. Design the contract so Instant Booking can be added later with explicit inventory/rate rules.

## 16. Complete Reservation Lifecycle

Draft → Booking Request → Pending Review → Approved/Confirmed → Awaiting Payment or Partially Paid → Ready for Pickup → Checked In/Converted to Rental; alternative terminal states are Cancelled, Declined, Expired, No-show, or Vehicle Unavailable.

A reservation holds an intended time interval and requirements; it does not mean a specific vehicle is physically out on rent. Assignment may be vehicle-specific or category-based until an operational cutoff. Every transition records actor, reason, and timestamp.

## 17. Complete Rental Lifecycle

Reservation/Walk-in → Verification Pending → Assigned → Deposit/Payment Pending → Pre-check Pending → Agreement Pending → Checked Out → Active → Extension Requested/Approved where applicable → Return Due → Returned/Check-in Pending → Charges Pending → Settled → Deposit Refunded/Retained/Partially Refunded → Closed → Vehicle Preparation → Available.

Separate financial settlement from physical return. A returned vehicle can be physically checked in while damage or payment review remains open. Early termination, replacement vehicle, and disputed charges are explicit subflows, not hidden status hacks.

## 18. Vehicle Lifecycle

Draft → Active/Available → Reserved/Allocated → Pickup Due → On Rent → Return Due/Overdue → Check-in Pending → Preparation → Available. Parallel blocking conditions include Maintenance, Damaged, Inspection Pending, Out of Service, and Retired. Do not encode every operational label as a permanent vehicle state; some are computed from dates and active work.

## 19. Vehicle Availability Rules

Store durable operational state (active, maintenance, damaged, out-of-service, retired) and derive schedule state (reserved, pickup due, on rent, return due, overdue) from reservations/rentals and current time. Availability is a query, not a manually editable boolean.

Prevent conflicts transactionally: normalize time boundaries, lock or serialize assignment decisions, verify vehicle/location/status eligibility, and re-check before confirmation and checkout. A vehicle is unavailable when a confirmed reservation/rental overlaps, or when a blocking operational state covers the requested period. Buffer/cleaning time must be configurable and included in conflict checks. Category-level availability must not promise a vehicle until allocation rules are satisfied.

## 20. Customer / Driver Lifecycle

Lead/guest → Customer profile → Verification Pending → Verified/Approved → Active renter → Restricted/Blocked where policy requires → Archived. A customer can have multiple driver profiles and a rental-specific driver snapshot. Never mutate historical agreement facts when a profile later changes.

## 21. Payment & Security Deposit Lifecycle

Expected → Pending → Partially Paid → Paid → Failed/Rejected → Refunded/Voided. A deposit is a separate obligation: Required → Authorized/Collected → Held → Adjustment Proposed → Partially Refunded/Refunded/Retained → Disputed/Resolved. Each payment has method, amount, currency, reference, payer, allocation, status, and evidence; ledger-like records are append-only corrections rather than silent edits.

## 22. Checkout / Handover Workflow

Confirm reservation and eligibility → verify identity/licence → confirm drivers → collect required payment/deposit → allocate vehicle → capture pre-rental inspection, mileage, fuel, photos, and existing damage → accept agreement → record handover → mark rental active → send customer documents. Mobile/tablet must use a guided checklist, large controls, offline-tolerant draft capture where feasible, and a clear completion summary.

## 23. Return / Check-in Workflow

Find active rental → record actual return time/location → capture mileage/fuel/condition/photos → compare with checkout → record late, fuel, mileage, damage, toll, or other charges → flag inspection/approval if needed → settle or mark balance outstanding → process deposit decision → issue receipt/agreement → move vehicle to preparation, maintenance, damaged, or available.

## 24. Damage & Inspection Workflow

Use structured inspection templates with checklist items, severity, notes, and photos. Compare pre/post snapshots; allow staff to mark existing, new, uncertain, or not inspected. New damage can create a review case and charge proposal; customer acknowledgement is evidence, not a substitute for an internal approval policy. Preserve original media and metadata.

## 25. Maintenance Workflow

Track odometer/date-based service due, work orders, vendor/cost, expected completion, downtime, and release inspection. Maintenance blocks availability when safety or policy requires it. V1 needs due alerts and manual work orders, not a full workshop-management system.

## 26. Cancellation / No-show Workflow

Customer/business cancellation → capture actor, reason, policy outcome, timing, and refund/fee calculation → release reservation hold only after transaction completion → notify affected parties. No-show is an explicit outcome after a configurable grace period; it must not be inferred merely because staff forgot to update a booking.

## 27. Extension Workflow

Customer or staff requests extension → check conflicts, vehicle condition, payment/deposit, and policy → approve/decline/counter-propose → update end time only through a controlled transaction → recalculate charges and notify. If the extension conflicts, offer another vehicle, alternate return time, or decline with a reason; never silently overwrite the next reservation.

## 28. Major Exception Workflows

Vehicle unavailable: place reservation in exception queue, offer replacement, reassign with audit, or cancel/refund under policy. Vehicle damaged before pickup: block it, preserve original assignment history, and notify staff/customer. Late return: mark overdue, notify, apply policy, and escalate. Different-location return: require authorization and location fee/policy. Accident: open incident, preserve evidence, block vehicle, and escalate externally where required. Unpaid rental: allow configured operational hold/closure policy, never fake settlement. Early termination: calculate actual period and charges, perform inspection, settle, and close with reason.

## 29. Notification Architecture

Create an event-driven notification layer with preferences, deduplication, delivery status, and templates. V1 channels: in-app and email. Events: booking request/approval/decline, payment recorded, pickup/return reminders, overdue, extension request, damage review, maintenance due, trial expiry, subscription change. Reserve SMS/WhatsApp for P1; do not send repeated reminders without escalation rules.

## 30. Document / Agreement Architecture

Document types: rental agreement, booking confirmation, invoice/receipt, inspection report, deposit statement, identity/licence evidence, damage report, payment proof. Store immutable generated versions with template/version metadata, signer/acknowledgement, tenant, rental/reservation link, and access policy. PDFs and images belong in object storage, not database blobs.

## 31. Reporting Architecture

V1 operational reports: bookings by status, revenue/collections, outstanding payments, active/overdue rentals, fleet utilization, vehicle revenue, deposit liabilities, maintenance due, and customer activity. Reports must define timezone, date basis, currency, and inclusion rules. Keep dashboard metrics near-real-time and analytics intentionally simple; export CSV/PDF only where useful.

## 32. SaaS Trial & Subscription Lifecycle

Registered → Trial Active (30 days) → Trial Reminder → Trial Expiring → Grace Period → Active Paid → Past Due/Manual Verification → Suspended → Archived. Recommend a 7-day read-only grace period after expiry, with no new bookings/checkout after suspension. Preserve data for at least a defined retention window (recommend 90 days after suspension, subject to legal policy), then archive/delete by policy. Manual payment proof can activate a plan after Super Admin verification. Trial reminders at 14, 7, 3, 1 days and expiry are sufficient.

## 33. Pakistan-first Payment Strategy

Rental-customer methods: cash, bank transfer, Easypaisa, JazzCash, manual payment, and future online gateway. SaaS billing initially uses plan selection, local payment instructions, reference/proof submission, and Super Admin approval. Use a provider-agnostic payment abstraction with payment intents/records, methods, allocation, evidence, refunds, and reconciliation; gateway adapters must not leak into booking or rental logic. No Stripe dependency in V1.

## 34. Recommended Final Tech Stack

Next.js and React with TypeScript for public and authenticated web; Node.js/TypeScript with NestJS for the API; PostgreSQL; Prisma for transactional data access; Redis plus a durable job queue such as BullMQ; S3-compatible object storage; an email provider with templating; OpenTelemetry-compatible logging/metrics; Playwright and unit/integration testing. Deploy web/API/worker independently but from one repository initially.

NestJS is recommended because its module, dependency-injection, validation, guards, testing, and background integration conventions reduce V1 architectural drift. A well-structured Fastify-based TypeScript service is a valid alternative, but should not be selected merely to avoid NestJS abstractions.

## 35. Frontend Architecture Recommendation

Use Next.js App Router with route groups for public, business, platform, and customer surfaces. Use server rendering for SEO pages and server-side data access where appropriate; use a typed API client for interactive authenticated workflows. Keep domain features organized by business capability, with shared primitives and feature-specific compositions. URL filters should be deep-linkable. Never duplicate availability or authorization decisions in client-only logic.

## 36. Backend Architecture Recommendation

Modular monolith with modules for identity, tenancy, businesses/locations, fleet, customers, reservations, rentals, inspections, maintenance, payments, documents, notifications, reporting, subscriptions, and audit. Controllers handle transport; application services orchestrate use cases; domain rules remain testable; repositories isolate Prisma. Commands that alter state should be idempotent where retries are possible. Jobs handle reminders, document generation, and reconciliation.

## 37. Database & ORM Recommendation

PostgreSQL is the correct primary database because relationships, constraints, transactions, reporting, and concurrency matter. Prisma is recommended for speed and type safety, with explicit SQL/migrations for advanced locking, exclusion constraints, or reporting queries when necessary. Do not rely on ORM convenience alone for overlap prevention; database constraints and transaction strategy must enforce it.

## 38. Authentication Recommendation

Use a managed identity provider supporting secure email/password, password reset, MFA for platform/owner roles, verified email, sessions, and organization membership, or implement these only with a mature library and security review. Business users and customers should have distinct access policies; customer magic links may be added for low-friction portal access, but must be scoped, expiring, and revocable. Authorization remains in the API, not the identity provider alone.

## 39. Multi-Tenant Architecture Recommendation

Use a shared PostgreSQL database with tenant_id on every tenant-owned aggregate and repository methods requiring tenant context. Resolve tenant membership server-side; never trust a tenant ID from the browser. Add automated cross-tenant authorization tests, query review rules, tenant-scoped background jobs, tenant-aware storage prefixes, export checks, and portal/public token scoping. Consider PostgreSQL row-level security as defense in depth after the application model is stable; it should not replace application authorization.

## 40. File / Image Storage Recommendation

Use private S3-compatible object storage with tenant-scoped keys, short-lived signed URLs, MIME/size validation, virus scanning where available, encryption, retention rules, and immutable references for evidence. Do not expose predictable object paths. Generate thumbnails and optimized public images separately from private identity/damage evidence.

## 41. Notification Infrastructure Recommendation

Use an outbox/event pattern so committed business events drive jobs reliably. Worker retries must be bounded and idempotent. Store template versions, delivery attempts, provider message IDs, and failure states. Keep notification generation separate from business transaction code.

## 42. Design System Strategy

Establish foundations first: semantic color roles, typography scale, spacing, radii, elevation, icon rules, layout containers, breakpoints, and status semantics. Then build navigation, buttons, forms, tables, filters, cards, drawers, modals, calendars, vehicle/customer cards, timelines, alerts, and state patterns. Components should encode behavior and accessibility, not just visual wrappers.

## 43. CSS / Theme Architecture

Use Ant Design as the primary component system, customized through centralized theme tokens and CSS Modules for product-specific layout and composition. Use CSS variables for semantic tokens and a small global stylesheet for reset, typography, and app foundations. No inline styles, Tailwind utility sprawl, or scattered hex/radius values. Theme changes should be made centrally; CSS Modules prevent accidental cross-page leakage.

## 44. Responsive UX Strategy

Desktop supports dense operational tables and multi-pane workflows. Tablet supports split views and guided field operations. Mobile uses task-focused cards, sticky next actions, bottom sheets, progressive disclosure, and simplified lists instead of squeezed tables. Checkout/return should work comfortably with one hand, camera/photo capture, and intermittent connectivity safeguards. Public pages prioritize touch targets and fast loading.

## 45. SEO Architecture

Index marketing pages and intentionally public business/vehicle pages; noindex authenticated surfaces and private booking states. Use semantic headings, unique metadata, canonical URLs, Open Graph, sitemap, robots rules, structured data where truthful (Organization, LocalBusiness, Product/Vehicle where suitable), clean slugs, internal links, server-rendered content, optimized images, and Core Web Vitals budgets. Public routes should be `/rentals/[businessSlug]`, `/rentals/[businessSlug]/vehicles`, and `/rentals/[businessSlug]/vehicles/[vehicleSlug]`; never expose private customer or inventory data through SEO pages.

## 46. Security Architecture

Enforce server-side authorization, tenant scoping, secure session/cookie settings, CSRF protection where applicable, input validation, rate limits, abuse protection for public booking, secure headers, secret management, dependency scanning, upload controls, audit logging, least privilege, encrypted transport/storage, backup/restore tests, and incident response procedures. Threat-model support access, exports, public identifiers, payment evidence, and identity documents.

## 47. Audit / Activity Architecture

Audit actor, tenant, action, entity, entity ID, before/after summary, reason, request/session correlation, timestamp, and source. Record booking/rental/payment/deposit/vehicle assignment/inspection/damage/maintenance/role/settings/subscription changes, exports, support access, and authentication/security events. Do not log every view or keystroke. Audit records should be append-only and access-controlled.

## 48. Error / Empty / Loading State Strategy

Every workflow needs actionable loading, empty, validation, permission, conflict, retry, and success states. Explain what happened in operational language and provide the next safe action. Conflict errors must identify the conflicting time/resource without leaking another tenant's data. Use skeletons for page structure, optimistic UI only for low-risk interactions, and error boundaries with correlation IDs for support.

## 49. P0 — Client-ready V1 Scope

Tenant registration/onboarding/trial; business and location setup; core RBAC; fleet and customer/driver records; reservation request and approval; availability/conflict prevention; payment recording and deposit tracking; guided checkout and return; inspections/photos/damage basics; maintenance blocking and due reminders; invoices/receipts/documents; Today operations; essential email notifications; manual SaaS subscription verification; public Request-to-Book site; customer booking/status/documents portal; essential reports; audit log; responsive UX; SEO marketing/public pages; security and backup baseline.

## 50. P1 — Next Release Scope

Instant booking; online gateway adapters; SMS/WhatsApp; richer pricing/rate rules and extras; multi-location transfer workflows; customer self-service identity upload; advanced exports; custom roles; richer analytics; offline-first field workflows; automated deposit refund integration; recurring maintenance schedules; localization and tax enhancements.

## 51. P2 — Future Scope

Marketplace/channel integrations; fleet telematics; dynamic pricing; subscription rentals; advanced accounting integrations; claims/insurance workflows; AI document extraction, damage assistance, forecasting, and pricing recommendations; enterprise SSO; row-level tenant partitioning/sharding; franchise benchmarking.

## 52. Complete Screen/Page Inventory

| Surface | Page | Purpose | Primary user | Primary actions |
|---|---|---|---|---|
| Marketing | Home | Explain product and convert | Visitor | View proof, start trial, sign in |
| Marketing | Product/Features | Explain workflows | Visitor | Explore capabilities |
| Marketing | Pricing | Explain plans/trial | Visitor | Start trial |
| Marketing | FAQ/Resources | Resolve objections | Visitor | Read, contact |
| Marketing | Sign up/Sign in | Account entry | Owner/User | Register, authenticate |
| Marketing | Legal | Trust/compliance | Visitor | Read policies |
| Super Admin | Overview | Platform health | Super Admin | Inspect KPIs, alerts |
| Super Admin | Tenants | Manage businesses | Super Admin | Search, suspend, inspect |
| Super Admin | Tenant detail | Support/account review | Super Admin | Verify status, audit access |
| Super Admin | Plans/Subscriptions | Manage commercial state | Super Admin | Configure, approve, suspend |
| Super Admin | Payment verification | Review local proofs | Super Admin | Approve/reject |
| Super Admin | Users/Support access | Control platform access | Super Admin | Manage, grant audited access |
| Super Admin | Audit/Settings | Govern platform | Super Admin | Review, configure |
| Business | Today | Prioritize work | Owner/Staff | Resolve pickups, returns, alerts |
| Business | Reservations list/calendar | Manage bookings | Reservations Staff | Search, approve, assign |
| Business | Reservation detail | Operate one booking | Reservations Staff | Verify, pay, cancel, convert |
| Business | Rentals list/detail | Manage active lifecycle | Operations | Checkout, extend, return |
| Business | Fleet list/detail | Manage vehicles | Fleet/Admin | Create, block, edit, retire |
| Business | Availability | See conflicts/capacity | Manager | Filter, assign, resolve |
| Business | Customers/Drivers | Manage records | Staff | Create, verify, restrict |
| Business | Payments/Deposits | Track money | Finance | Record, allocate, refund/retain |
| Business | Checkout | Guided handover | Operations | Inspect, sign, activate |
| Business | Return | Guided check-in | Operations | Inspect, charge, settle |
| Business | Inspections/Damage | Evidence and cases | Operations/Fleet | Compare, document, approve |
| Business | Maintenance | Work and due items | Fleet | Create, schedule, release |
| Business | Documents | Find generated/evidence files | Staff | View, download, resend |
| Business | Reports | Monitor performance | Owner/Manager | Filter, export |
| Business | Team/Roles | Control access | Owner/Admin | Invite, assign, revoke |
| Business | Locations/Settings | Configure policies | Owner/Admin | Set rules, branding, booking |
| Business | Activity | Trace changes | Owner/Admin | Search audit events |
| Public rental | Business landing | Present local inventory | Guest | Choose dates, browse |
| Public rental | Vehicle list/detail | Compare vehicles | Guest | Select vehicle/request |
| Public rental | Booking form/review | Capture request | Guest | Enter details, submit |
| Public rental | Confirmation/status | Show outcome | Guest/Customer | View status, instructions |
| Customer | Sign in/secure link | Secure access | Customer | Authenticate |
| Customer | Bookings | View reservations | Customer | Open, cancel/request |
| Customer | Active rental | View current rental | Customer | Request extension, contact |
| Customer | Documents/Payments | Retrieve proof | Customer | View/download |
| Customer | Profile/Drivers | Maintain details | Customer | Edit, add driver |

## 53. High-Level Route Architecture

Public: `/`, `/product`, `/pricing`, `/resources`, `/login`, `/signup`.

Business: `/app/today`, `/app/reservations`, `/app/rentals`, `/app/fleet`, `/app/availability`, `/app/customers`, `/app/payments`, `/app/maintenance`, `/app/reports`, `/app/team`, `/app/settings`.

Platform: `/platform`, `/platform/tenants`, `/platform/subscriptions`, `/platform/payments`, `/platform/audit`.

Public rental: `/rentals/[businessSlug]`, `/rentals/[businessSlug]/vehicles`, `/rentals/[businessSlug]/vehicles/[vehicleSlug]`, `/rentals/[businessSlug]/book`.

Customer: `/portal`, `/portal/bookings/[id]`, `/portal/rental/[id]`, `/portal/documents`.

Route names are illustrative; access control and canonical URLs are the actual contract.

## 54. Key Domain Entities

Platform, tenant/business, subscription, plan, user, role, permission, membership, location, customer, driver, vehicle, vehicle category, rate plan, availability hold, reservation, reservation item, rental, rental driver, inspection, damage case, maintenance work order, payment, payment allocation, deposit, charge, invoice/receipt, document, notification, audit event, support access grant, and booking configuration. Relationships should preserve historical snapshots for agreements, prices, drivers, and vehicle condition.

## 55. Important Business Rules

Tenant and location scope are mandatory for tenant-owned data. Reservation and rental are distinct. No confirmed overlap for the same vehicle and effective time window. Checkout requires required verification, payment/deposit policy, assignment, pre-inspection, and agreement acceptance. Return records actual facts before settlement. Monetary values use integer minor units and explicit currency. Historical documents and inspection evidence are immutable. Only authorized roles may refund, retain deposits, override conflicts, or grant support access. All date calculations use the business timezone, with UTC storage and explicit displayed timezone.

## 56. Product Risks & Architecture Risks

Highest risks: availability race conditions; ambiguous pricing/tax/deposit rules; scope explosion; unsafe support/tenant access; poor mobile field usability; incomplete evidence for disputes; manual payment reconciliation; notification fatigue; timezone/DST errors; over-permissive exports; and prematurely complex billing. Mitigate through narrow P0 workflows, decision records, transaction tests, pilot feedback, explicit policy configuration, and security review before launch.

## 57. Decisions That Must Be Locked Before Development

Confirm target country/currency and tax expectations; Request-to-Book P0; exact pricing/deposit/late/fuel policies; assignment model (vehicle vs category); location and transfer rules; customer verification requirements; trial/grace/retention policy; supported document/signature standard; roles and approval boundaries; chosen identity provider; hosting/storage/email vendors; backup/RTO/RPO; brand tokens; public slug rules; and the definition of “settled” when balances remain outstanding.

## 58. Recommended Development Phase Breakdown

1. Technical foundation, design tokens, CI/CD, observability, environments.
2. Identity, tenant onboarding, trial, RBAC, and tenant isolation tests.
3. Business settings, locations, fleet, customers, and drivers.
4. Reservation, availability, assignment, and cancellation.
5. Payments, deposits, documents, and audit.
6. Checkout, inspection, active rental, return, settlement, and maintenance.
7. Today dashboard, notifications, essential reports, and responsive polish.
8. Marketing site, SEO, public Request-to-Book, and customer portal.
9. Super Admin and manual subscription verification.
10. Pilot, security/tenant-boundary testing, performance, accessibility, backup restore, content QA, and release hardening.

## 59. Definition of Done for V1

A new business can register, complete onboarding, add vehicles and policies, receive a public booking request, approve it, verify a customer, record payment/deposit, complete mobile checkout, manage an active rental, process return and inspection, calculate/record final charges, issue documents, and make the vehicle available again. Owners can see actionable Today work, essential reports, team permissions, audit history, and trial/subscription status. Public pages are responsive, indexable where intended, and SEO metadata is correct. Automated tests demonstrate tenant isolation, overlap prevention, role boundaries, critical lifecycle transitions, payment idempotency, and secure document access. Backups restore successfully and no known P0 security, data-integrity, or workflow blocker remains.

## 60. Final Architecture Decision Summary

- Build a focused Rental Business Operating System, not a generic CRUD dashboard.
- Use a modular monolith for speed and clear boundaries; defer microservices.
- Use Next.js/React/TypeScript, NestJS/Node.js, PostgreSQL, Prisma, Redis/BullMQ, private object storage, and provider-agnostic payments.
- Make tenant isolation, transactional availability, capability-based RBAC, auditability, and historical evidence first-class.
- Make Request-to-Book the public booking MVP; defer instant booking until policy and payment confidence exist.
- Support Pakistan-first manual/local payment methods without a Stripe dependency.
- Use Ant Design as the one primary component system, customized with centralized tokens and CSS Modules; prohibit inline CSS and scattered design values.
- Optimize V1 around complete booking → checkout → rental → return → settlement workflows.
- Keep P1/P2 complexity out of the first release unless it directly protects those workflows.

