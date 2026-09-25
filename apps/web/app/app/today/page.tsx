import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import Link from 'next/link';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import { TodaySummary, type TodayData } from './today-summary';
import styles from '../../../components/ui.module.css';
export const metadata = { robots: { index: false, follow: false } };
export default async function TodayPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!session.apiAccessToken) redirect('/login' as Route);
  if (!permissions.includes('dashboard.view')) {
    return <AppShell workspace="Business workspace" selectedKey="today" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><h1>Today is not available to your role.</h1><p>Ask your business owner if you need the operations overview.</p></div></section></PageContainer></AppShell>;
  }
  const headers = { authorization: `Bearer ${session.apiAccessToken}` };
  const todayResponse = await fetch(new URL('/api/business/operations/today', process.env.API_URL ?? 'http://localhost:4000'), { headers, cache: 'no-store' });
  if (todayResponse.status === 401) redirect('/login' as Route);
  const today = todayResponse.ok ? await todayResponse.json() as TodayData : null;
  if (!session.user.permissions?.includes('settings.manage')) {
    return <AppShell workspace="Business workspace" selectedKey="today" navigation={navigation}><PageContainer>
      <section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Business workspace</span><h1>Good to see you.</h1><p>Here is what your rental team needs to know today.</p></div></section>
      {today ? <TodaySummary data={today} permissions={permissions} /> : <section className={styles.section}><p>Today’s operations could not be loaded. Refresh this page to try again.</p></section>}
    </PageContainer></AppShell>;
  }
  const [setupResponse, subscriptionResponse] = await Promise.all([
    fetch(new URL('/api/business/onboarding', process.env.API_URL ?? 'http://localhost:4000'), { headers, cache: 'no-store' }),
    fetch(new URL('/api/business/subscription', process.env.API_URL ?? 'http://localhost:4000'), { headers, cache: 'no-store' }),
  ]);
  if (!setupResponse.ok || !subscriptionResponse.ok) redirect('/login' as Route);
  const setup = await setupResponse.json() as { business: { name: string; slug: string }; settings: { currency: string; onboardingCompletedAt: string | null; onboardingStep: number }; locations: { name: string }[]; vehicle: { make: string; model: string } | null };
  const subscription = await subscriptionResponse.json() as { status: string; trialEndsAt: string | null; plan: { name: string } | null };
  const workspaceReady = Boolean(setup.settings.onboardingCompletedAt);
  const trialEnd = subscription.trialEndsAt ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(subscription.trialEndsAt)) : null;
  return <AppShell workspace="Business workspace" selectedKey="today" navigation={navigation}><PageContainer>
    <section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>{workspaceReady ? 'Business operations' : `Setup in progress · Step ${Math.min(setup.settings.onboardingStep + 1, 8)} of 8`}</span><h1>{workspaceReady ? `Today at ${setup.business.name}.` : `Pick up where you left off, ${setup.business.name}.`}</h1><p>{workspaceReady ? 'Your live operations overview is below. Open a task to take action.' : 'Your progress is saved. Finish the essentials now or return when it suits you; nothing you entered has been lost.'}</p></div><a className={styles.workspaceAction} href="/dashboard/onboarding">{workspaceReady ? 'Review business setup' : 'Continue setup'}</a></section>
    {today ? <TodaySummary data={today} permissions={permissions} /> : <section className={styles.section}><p>Today’s operations could not be loaded. Refresh this page to try again.</p></section>}
    <div className={styles.workspaceCards} aria-label="Workspace summary"><section className={styles.workspaceCard}><span>Subscription</span><strong>{subscription.status === 'TRIALING' ? '30-day free trial' : subscription.status.replaceAll('_', ' ')}</strong><p>{trialEnd ? `Trial ends ${trialEnd}.` : 'Your subscription status is up to date.'}{subscription.plan ? ` Plan: ${subscription.plan.name}.` : ''}</p></section><section className={styles.workspaceCard}><span>Pickup location</span><strong>{setup.locations[0]?.name ?? 'Not set yet'}</strong><p>{setup.locations.length ? `${setup.locations.length} location${setup.locations.length === 1 ? '' : 's'} added to your workspace.` : 'Add a location so your team knows where handovers happen.'}</p></section><section className={styles.workspaceCard}><span>Booking page</span><strong>{workspaceReady ? 'RentPay hosted page' : 'Publish after setup'}</strong><p>{setup.vehicle ? `${setup.vehicle.make} ${setup.vehicle.model} is listed on your page.` : 'Your page can show your business and vehicles once setup is complete.'}</p>{workspaceReady && <Link href={`/rentals/${setup.business.slug}`} target="_blank" rel="noreferrer">Preview /rentals/{setup.business.slug}</Link>}</section></div>
  </PageContainer></AppShell>;
}
