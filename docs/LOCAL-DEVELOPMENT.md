# Local development

## Requirements

Node.js 22 LTS, npm 10.9.8, PostgreSQL 16 or newer, and a Windows/macOS/Linux environment. PostgreSQL should listen on loopback for local work. Docker is optional; use a local PostgreSQL service or `docker compose` as preferred by your environment.

## Setup

1. Copy `.env.example` to `.env`, set a unique `AUTH_SECRET` (at least 32 characters), and point `DATABASE_URL` at a local database.
2. Run `npm ci` at the repository root.
3. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
4. Start API and web with `npm run dev --workspace @rentpay/api` and `npm run dev --workspace @rentpay/web` in separate terminals.
5. Open `http://localhost:3000`; API health is available at `http://localhost:4000/api/health`.

Development seed accounts and initial password are documented by the seed output/code and must be changed before real use. Verification/reset/invitation emails are captured in the development mailbox endpoint, not delivered externally. Do not use seeded identities or local trust-auth outside development.

Payment plans are created by a Super Admin through the platform plans API. Prices are integer minor units in PKR; no production price is assumed by the seed. Configure the `SUBSCRIPTION_BANK_TRANSFER_INSTRUCTIONS`, `SUBSCRIPTION_EASYPAISA_INSTRUCTIONS`, and `SUBSCRIPTION_JAZZCASH_INSTRUCTIONS` variables with test-only directions to exercise the manual payment flow locally. Production startup requires real configured instructions for all three methods.

## Verification

For contact-form development delivery, set `CONTACT_EMAIL` to a test inbox. Without it, the public contact endpoint returns a safe unavailable response. Production startup requires this mailbox plus working SMTP.

`npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build` run the checks. `npm run db:validate`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` verify persistence setup. Playwright starts its own API on port 4100 and production web server on port 3101 so an existing preview/API cannot silently override test configuration; it requires a migrated, seeded PostgreSQL database. If the test servers are started separately on those ports, set `E2E_EXTERNAL_SERVERS=1` for the test command to skip Playwright's server lifecycle. Production rate limiting requires Redis; local development uses in-memory throttling. The isolated `NODE_ENV=test` API uses higher registration/login/global request ceilings so the full local integration suite can run from one loopback IP, while the forgot-password throttling test retains its three-attempt limit; production limits are unchanged.
