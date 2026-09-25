import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
export const metadata = { robots: { index: false, follow: false } };
export default async function PortalPage() { const session = await auth(); if (!session?.user) redirect('/portal/login' as Route); if (session.user.accountType !== 'CUSTOMER') redirect('/portal/login' as Route); return <main className="rp-page"><section className="rp-container"><h1 className="rp-heading">Your rentals</h1><p className="rp-muted">Your bookings, documents, and payment updates will appear here.</p></section></main>; }
