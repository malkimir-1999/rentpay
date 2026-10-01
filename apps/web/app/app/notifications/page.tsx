import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import { NotificationsWorkspace } from './workspace';

export const metadata = { title: 'Notifications | RentPay', robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  return <AppShell workspace="Business workspace" selectedKey="notifications" navigation={businessNavigation(session.user.permissions ?? [])}><PageContainer><NotificationsWorkspace /></PageContainer></AppShell>;
}
