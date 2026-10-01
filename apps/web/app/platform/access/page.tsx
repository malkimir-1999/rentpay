import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { AppShell, PageContainer } from '../../../components/ui';
import { PlatformWorkspace, type PlatformData } from './workspace';

export const metadata = { title: 'Platform access', robots: { index: false, follow: false } };

export default async function PlatformAccessPage() {
  const session = await auth();
  if (session?.user?.accountType !== 'PLATFORM' || session.user.platformRole !== 'SUPER_ADMIN' || !session.apiAccessToken) redirect('/platform/login');
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const origin = process.env.API_URL ?? 'http://localhost:4000';
  const paths = ['/api/platform/overview', '/api/platform/businesses', '/api/platform/subscription-payments/pending', '/api/platform/plans', '/api/platform/audit'];
  const responses = await Promise.all(paths.map((path) => fetch(new URL(path, origin), { headers, cache: 'no-store' })));
  if (responses.some((response) => response.status === 401 || response.status === 403)) redirect('/platform/login');
  if (responses.some((response) => !response.ok)) return <AppShell workspace="Platform administration" selectedKey="overview" navigation={[{ key: 'overview', label: 'Overview', href: '/platform/access' }]}><PageContainer><h1>Platform data is unavailable</h1><p>Nothing has been changed. Refresh the page to try again.</p></PageContainer></AppShell>;
  const [overview, businesses, pendingPayments, plans, audit] = await Promise.all(responses.map((response) => response.json()));
  const data = { overview, businesses, pendingPayments, plans, audit } as PlatformData;
  return <AppShell workspace="Platform administration" selectedKey="overview" navigation={[{ key: 'overview', label: 'Overview', href: '/platform/access' }]}><PageContainer><PlatformWorkspace initialData={data} /></PageContainer></AppShell>;
}
