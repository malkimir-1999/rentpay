import 'next-auth';
import type { DefaultSession } from 'next-auth';
declare module 'next-auth' {
 interface User { accountType?: string; businessId?: string; permissions?: string[]; platformRole?: string; apiAccessToken?: string; apiAccessTokenExpiresAt?: number; }
 interface Session { apiAccessToken?: string; user: { accountType?: string; businessId?: string; permissions?: string[]; platformRole?: string } & NonNullable<DefaultSession['user']>; }
}
declare module 'next-auth/jwt' { interface JWT { accountType?: string; businessId?: string; permissions?: string[]; platformRole?: string; apiAccessToken?: string; apiAccessTokenExpiresAt?: number; apiAccessTokenError?: boolean; } }
