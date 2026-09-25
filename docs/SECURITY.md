# Security model

## Identity and sessions

Passwords are derived with Node.js `scrypt` using per-password cryptographic salts and timing-safe verification. Login returns a signed, short-lived API bearer token backed by a revocable database session. Auth.js stores its session as an encrypted HTTP-only cookie, uses `SameSite=Lax`, and enables the `Secure` cookie flag in production. The API requires bearer authorization for protected routes and never treats a client-supplied tenant ID as proof of access. Password reset and logout revoke server-side sessions. Verification, reset, and invitation tokens are random, hashed at rest, expiring, and single-use.

Forgot-password and verification-resend responses do not disclose whether an account exists. Sensitive routes have individual throttles; all API routes have a global throttle. Development uses bounded in-memory throttling; production startup requires Redis for shared limits. Production startup also validates SMTP, contact mailbox, database, Auth.js secret, and origin configuration.

## Browser/API protections

The API uses Helmet headers and CSP. Next.js 16 `proxy.ts` generates a fresh cryptographic nonce per page request, forwards the policy to rendering so framework scripts receive that nonce, and returns the same CSP to the browser. Scripts are restricted to same-origin/nonce-authorized sources (`strict-dynamic`); inline style attributes remain allowed for Ant Design compatibility. This makes rendered pages dynamic so a request-specific nonce can be attached. Browser API traffic uses the same-origin backend bridge; the backend origin is server-only. Deployments must review any added third-party asset origin. API CORS allows only the configured web origin, with credentials disabled.

Auth.js uses its framework CSRF protections for cookie-backed sign-in/sign-out actions. Set `AUTH_TRUST_HOST=true` only behind a trusted reverse proxy that validates the host/forwarded-host headers. The API does not accept ambient browser cookies: state-changing authenticated API calls require an explicit bearer token, so cross-site form submission cannot borrow an API session. Public state-changing auth endpoints are validated, throttled, and do not establish a cookie session. Do not enable cookie-based API authentication without adding a synchronizer/double-submit CSRF control and origin checks.

## Authorization and data

The API verifies account type and live database state, then independently enforces either customer access, platform permissions, or active business membership plus capability. Tenant queries explicitly filter by trusted business ID. Uploaded content is limited to supported formats by file signature, size, and generated storage key; original filenames are not used as paths. Logs omit passwords, bearer tokens, reset tokens, and file contents. API error responses omit stack traces and infrastructure details. Audit rows are append-only at the database layer.

## Production checklist

Use TLS, unique managed secrets, a managed PostgreSQL instance, Redis, configured SMTP and `CONTACT_EMAIL`, private object storage, backups/restore drills, centralized log retention, dependency scanning, and provider-specific CSP review. Configure all three `SUBSCRIPTION_*_INSTRUCTIONS` variables with real RentPay receiving details before accepting production manual payments; never commit those values. Review and approve legal operator details and legal copy before collecting production consent. Local trust-auth PostgreSQL, local file storage, seeded accounts, and the development email mailbox are development-only and must never be exposed as production services.
