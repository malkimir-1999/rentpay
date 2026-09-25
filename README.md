# RentPay

RentPay is a multi-tenant rental-management SaaS for rental businesses, their teams, platform operators, and customers. Phase 1 established the application foundation; Phase 2 adds the public marketing site, authentication experience, and persisted business setup. Full fleet, booking, rental, and website-builder workflows remain later phases.

## Stack

- Next.js App Router, React, TypeScript strict mode, Auth.js-compatible session bridge
- NestJS API with independent authentication, tenant membership, and permission enforcement
- PostgreSQL and Prisma migrations
- Ant Design 6, centralized RentPay tokens, CSS Modules, and Inter
- Vitest unit/integration tests and Playwright end-to-end tests

## Workspace layout

`apps/web` contains public/authenticated Next.js surfaces. `apps/api` contains domain-oriented API modules, Prisma schema/migrations, and development seed. `packages/contracts`, `packages/config`, and `packages/validation` hold shared contracts/config/validation. `docs/` describes the implemented architecture and security boundaries.

## Get started

See [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md) for prerequisites and the complete local setup. In short: configure `.env`, run `npm ci`, then `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, and start the web/API workspaces. Never expose seeded accounts, local storage, the development mailbox, or trust-auth PostgreSQL to the public internet.

## Verification commands

```powershell
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

Production requires managed secrets, PostgreSQL, Redis-backed rate limiting, SMTP, TLS, private object storage and a configured contact mailbox. Consult [docs/SECURITY.md](docs/SECURITY.md) before deployment. See [docs/PHASE-2-MARKETING-AUTH-ONBOARDING.md](docs/PHASE-2-MARKETING-AUTH-ONBOARDING.md) for the implemented surfaces and known production inputs. Legal copy is review draft, not counsel-approved terms.
