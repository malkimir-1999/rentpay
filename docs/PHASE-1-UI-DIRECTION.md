# RentPay UI/UX Direction — Approval Draft

## Design intent

RentPay will use one shared product language across marketing, authentication, business operations, customer portal, and public booking. Marketing and booking can use cinematic automotive imagery; authenticated operations remain light-first, calm, and information-dense.

## Usability standard

RentPay serves a deliberately mixed audience: approximately half technically confident operators and half people who are not highly technical. Every feature must therefore be understandable without training and efficient for experienced users.

- Prefer recognition over memory: visible labels, plain language, familiar icons paired with text, and obvious next actions.
- Make the common path short: use progressive disclosure, smart defaults, sensible prefill, inline validation, and guided one-purpose steps.
- Keep each screen focused on one job. Avoid exposing configuration complexity until it is needed.
- Use operational language that rental staff already understand: pickup, return, overdue, deposit, payment, vehicle ready.
- Make irreversible actions explicit with a clear consequence and confirmation; make safe actions fast.
- Every empty state explains what it means and gives the next useful action.
- Every error explains the problem in human language and how to recover without losing entered work.
- Every workflow provides clear progress, completion feedback, and a visible return path.
- Support keyboard, touch, tablet, and mobile use with accessible labels, focus states, adequate hit targets, and reduced-motion support.
- Use role-aware navigation so users see the work relevant to them instead of an intimidating full product map.
- Preserve expert speed with search, keyboard-friendly controls, saved filters, deep links, and sensible bulk actions—without making them mandatory for beginners.

The quality bar is: a first-time staff member can complete the primary task correctly after reading the screen once, while an experienced operator can complete it quickly with minimal clicks.

## Engineering quality constraint

Future implementation must favor small composable components, shared primitives, typed contracts, domain-oriented modules, and single sources of truth. Do not duplicate business rules, page layouts, tokens, or API types. Follow Next.js App Router and React Server Component best practices, keep client components narrow, avoid unnecessary global state, and keep public routes server-rendered and SEO-compatible.

## Shared foundations

- Inter throughout.
- Light-first backgrounds: `--rp-color-bg-page`, white surfaces, soft borders.
- Primary action: RentPay green token (product-owner visual revision, September 2026), used sparingly for CTA and selected state. The previous orange/blue brand direction is superseded for RentPay-owned surfaces.
- 12–16px surface radius, restrained shadow, generous page gutters, clear section rhythm.
- Ant Design remains the single dashboard component system, customized through the central theme.
- CSS Modules and global CSS variables only. No inline styles or arbitrary hardcoded visual values.

## Surface direction

### Marketing

Editorial automotive hero, a clear trial action, layered product preview, concise operational story, and footer. The page should feel premium through composition, vehicle imagery, typography, soft-grey layering, and whitespace. Scroll-entry motion is restrained and respects reduced-motion preferences.

### Business dashboard

Persistent but collapsible navigation, compact topbar, actionable Today view, metric cards only when they lead to work, timeline/list surfaces, and fleet readiness cards. Operational density increases inside content areas while the shell stays spacious.

### Public booking

Search-first: location, pickup date, return date, and vehicle results. Filters remain simple and responsive. Vehicle cards emphasize image, category, transmission/fuel, capacity, price, and one clear action.

### Customer portal

Simpler navigation than the business app. Lead with the next booking or active rental, then documents, payment summary, and support. Status and next action should always be visible.

## Website builder direction

The builder is a separate business-owned public-site customization layer, not a way to alter RentPay's internal dashboard. Flow: Theme → Branding → Pages → Sections → Edit → Reorder → Preview → Publish. Starter themes: Premium Automotive, Modern Light, Bold, and Minimal. Every theme consumes the same content model and supports responsive preview, connected vehicle sections, booking/search sections, per-page SEO, RentPay-hosted URLs, and future custom domains.

## Approval checkpoint

Approved for implementation. Phase 2 marketing, authentication, onboarding and public rental surfaces use this shared direction. Business-owned sites remain separately themeable in the later website-builder phase.
