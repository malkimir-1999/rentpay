import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { AppShell, PageContainer } from '../../../components/ui';
import styles from '../../../components/ui.module.css';
export const metadata = { title: 'Platform access', robots: { index: false, follow: false } };
export default async function PlatformAccessPage() {
  const session = await auth();
  if (session?.user?.accountType !== 'PLATFORM' || session.user.platformRole !== 'SUPER_ADMIN') redirect('/platform/login');
  return <AppShell workspace="Platform administration" selectedKey="overview" navigation={[{ key: 'overview', label: 'Overview', href: '/platform/access' }]}><PageContainer>
    <section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Super Admin</span><h1>Platform workspace</h1><p>Your platform identity is verified. Business workspaces remain accessible only through their own membership.</p></div></section>
    <div className={styles.workspaceCards}><section className={styles.workspaceCard}><span>Access</span><strong>Separate platform account</strong><p>Platform access is kept apart from each rental business.</p></section><section className={styles.workspaceCard}><span>Subscriptions</span><strong>Manual verification</strong><p>Bank Transfer, Easypaisa and JazzCash submissions have a dedicated approval flow.</p></section><section className={styles.workspaceCard}><span>Activity</span><strong>Audited actions</strong><p>Meaningful security and subscription decisions are recorded.</p></section></div>
  </PageContainer></AppShell>;
}
