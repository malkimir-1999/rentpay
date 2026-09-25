import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
type ApiUser = { id: string; email: string; accountType: string; businessId?: string; permissions: string[]; platformRole?: string };
export const { handlers, auth, signIn, signOut } = NextAuth({
 session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
 pages: { signIn: '/login' },
 providers: [Credentials({
  credentials: { email: {}, password: {}, accountType: {} },
  async authorize(credentials) {
   const response = await fetch(new URL('/api/auth/login', process.env.API_URL ?? 'http://localhost:4000'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials), cache: 'no-store' });
   if (!response.ok) return null;
   const result = await response.json() as { accessToken: string; accessTokenExpiresAt: number; user: ApiUser };
   return { id: result.user.id, email: result.user.email, accountType: result.user.accountType, businessId: result.user.businessId, permissions: result.user.permissions, platformRole: result.user.platformRole, apiAccessToken: result.accessToken, apiAccessTokenExpiresAt: result.accessTokenExpiresAt };
  }
 })],
 callbacks: {
  async jwt({ token, user }) {
   if (user) { token.apiAccessToken = user.apiAccessToken; token.apiAccessTokenExpiresAt = user.apiAccessTokenExpiresAt; token.accountType = user.accountType; token.businessId = user.businessId; token.permissions = user.permissions; token.platformRole = user.platformRole; }
   if (token.apiAccessToken && typeof token.apiAccessTokenExpiresAt === 'number' && Date.now() > token.apiAccessTokenExpiresAt - 60000) {
    try {
     const response = await fetch(new URL('/api/auth/refresh', process.env.API_URL ?? 'http://localhost:4000'), { method: 'POST', headers: { authorization: 'Bearer ' + token.apiAccessToken }, cache: 'no-store' });
     if (!response.ok) throw new Error('Session refresh failed');
     const refreshed = await response.json() as { accessToken: string; accessTokenExpiresAt: number };
     token.apiAccessToken = refreshed.accessToken; token.apiAccessTokenExpiresAt = refreshed.accessTokenExpiresAt;
    } catch { token.apiAccessTokenError = true; }
   }
   return token;
  },
  async session({ session, token }) { session.apiAccessToken = token.apiAccessToken as string; session.user.accountType = token.accountType as string; session.user.businessId = token.businessId as string | undefined; session.user.permissions = token.permissions as string[]; session.user.platformRole = token.platformRole as string | undefined; return session; }
 },
});
