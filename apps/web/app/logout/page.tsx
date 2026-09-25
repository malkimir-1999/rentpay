import { auth, signOut } from '../../auth';
export const metadata = { robots: { index: false, follow: false } };
export default function LogoutPage() { return <form className="rp-page" action={async () => { 'use server'; const session = await auth(); if (session?.apiAccessToken) await fetch(new URL('/api/auth/logout', process.env.API_URL ?? 'http://localhost:4000'), { method: 'POST', headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' }); await signOut({ redirectTo: '/login' }); }}><button className="rp-button">Sign out</button></form>; }
