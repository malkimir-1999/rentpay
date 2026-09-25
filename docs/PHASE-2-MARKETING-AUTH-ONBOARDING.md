# Phase 2 — Marketing, Auth and Business Setup

## Public pages

Next.js server-rendered pages are implemented for `/`, `/features`, `/how-it-works`, `/pricing`, `/solutions`, `/solutions/small-rental-business`, `/solutions/growing-fleets`, `/about`, `/contact`, `/faq`, `/legal/privacy`, and `/legal/terms`. Shared marketing header/footer, responsive navigation, reusable content layouts, CTA patterns, and native FAQ disclosure controls live in the web app. Page metadata has unique titles/descriptions and canonical/Open Graph URLs; the home page publishes Organization and SoftwareApplication JSON-LD, FAQ publishes FAQPage JSON-LD, and sitemap includes public marketing and published rental URLs. Robots disallows private areas; private routes also set noindex metadata.

Pricing reads only purchasable plan records from `/api/public/plans`. Plan limits and feature descriptions are optional database fields, and no prices are seeded or invented. With no configured plans, the page explains that without placeholder prices. Contact/demo submits to a rate-limited public API route and sends through the email notification provider to `CONTACT_EMAIL`.

## Authentication and registration

Business login uses the Auth.js Credentials session bridge and the independently enforced API bearer session. Registration validates in the shared Zod package and API DTO, stores the accepted terms version, and atomically creates the account, business, owner membership, 30-day trial, country-aware settings, verification token and audit event. Email verification is required before login, consistent with Phase 1 identity policy; login then routes owners to incomplete setup and staff to their workspace. Forgot-password keeps its response generic. Reset tokens are single-use and expire. Invitation lookup returns only the invite’s business, email and role summary; acceptance creates or joins the user, then authenticates. Platform, customer and business login UI share the same form system while retaining separate API boundaries.

## Onboarding persistence

The guided sequence has a distinct welcome, seven setup checkpoints, and completion: business/contact/country; first pickup location; optional vehicle identity; optional starter pricing; rental basics; customer payment methods; hosted-page slug/brand color. A skipped vehicle also skips its pricing and remains easy to add later. Each Next/Back/Save-for-later action persists progress through authenticated `/api/business/onboarding` routes; vehicle rates are saved separately from vehicle identity. Country defaults come from `packages/config/src/countries.ts` (including PKR, Asia/Karachi and Pakistan rental payment methods). Server guards resolve membership and permissions; posted data never selects a tenant. The API refuses completion without a location and publishes the hosted page at `/rentals/{businessSlug}` when finished. The post-setup workspace displays real business, subscription, location and booking-page information without implying later operational modules are available.

The `Vehicle` record is intentionally limited to identity, location and starter rates; availability, bookings, inspections and fleet operations are not included. The hosted business page lists setup vehicles and contact details; it is not a booking-request workflow or website builder. “Save and finish later” persists the current step and returns to the workspace.

## Design/accessibility

Marketing, auth and onboarding use Inter, RentPay CSS variables and CSS Modules. Shared components use semantic links/forms and visible focus states. The onboarding wizard uses labeled native controls, announced step state, keyboard-operable actions, plain-language errors and mobile layouts. Reduced-motion behavior and shared focus rules live in the global stylesheet. Playwright covers marketing layouts at 320, 375, 768, 1024, 1440 and 2560 CSS pixels.

## Production readiness inputs

Legal pages are present but disclose that the legal operator, support contact, retention rules, governing law and final terms require approved details and review. They are not certified legal policies. Configure `CONTACT_EMAIL`, SMTP, Redis, database and real local subscription receiving instructions before production. No production plan prices are supplied by seed data.
