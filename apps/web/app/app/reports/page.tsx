import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import { UtilizationReport, type UtilizationData } from './utilization-report';

export const metadata = { title: 'Reports | RentPay', robots: { index: false, follow: false } };
const apiOrigin = process.env.API_URL ?? 'http://localhost:4000';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('report.view')) return <AppShell workspace="Business workspace" selectedKey="reports" navigation={navigation}><PageContainer><h1>Reports are not available to your role.</h1><p>Ask your business owner to grant report access.</p></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86400000);
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const response = await fetch(new URL(`/api/business/reports/utilization?${query}`, apiOrigin), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (response.status === 401) redirect('/login' as Route);
  if (!response.ok) return <AppShell workspace="Business workspace" selectedKey="reports" navigation={navigation}><PageContainer><h1>We could not load this report</h1><p>Your rental data is safe. Refresh to try again.</p></PageContainer></AppShell>;
  const initial = await response.json() as UtilizationData;
  return <AppShell workspace="Business workspace" selectedKey="reports" navigation={navigation}><PageContainer><UtilizationReport initialData={initial} canExport={permissions.includes('report.export')} /></PageContainer></AppShell>;
}
