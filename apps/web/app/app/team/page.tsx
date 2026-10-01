import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import { TeamWorkspace, type TeamData } from './workspace';

export const metadata = { title: 'Team | RentPay', robots: { index: false, follow: false } };

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('team.manage')) return <AppShell workspace="Business workspace" selectedKey="team" navigation={navigation}><PageContainer><section><h1>Team access is not available</h1><p>Ask the business owner to update your permissions if you need to manage staff.</p></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const response = await fetch(new URL('/api/business/team', process.env.API_URL ?? 'http://localhost:4000'), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (response.status === 401) redirect('/login' as Route);
  if (!response.ok) return <AppShell workspace="Business workspace" selectedKey="team" navigation={navigation}><PageContainer><section><h1>We could not load your team</h1><p>Your saved team information is safe. Refresh this page to try again.</p></section></PageContainer></AppShell>;
  const team = await response.json() as TeamData;
  return <AppShell workspace="Business workspace" selectedKey="team" navigation={navigation}><PageContainer><TeamWorkspace initialData={team} isOwner={session.user.role === 'OWNER'} /></PageContainer></AppShell>;
}
