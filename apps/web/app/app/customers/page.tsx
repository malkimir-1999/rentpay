import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { auth } from '../../../auth';
import { AppShell, PageContainer } from '../../../components/ui';
import { businessNavigation } from '../../../lib/business-navigation';
import styles from '../../../components/ui.module.css';
import { CustomersWorkspace, type BusinessCustomer } from './workspace';

export const metadata = { title: 'Customers | RentPay', robots: { index: false, follow: false } };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS') redirect('/login' as Route);
  const permissions = session.user.permissions ?? [];
  const navigation = businessNavigation(permissions);
  if (!permissions.includes('customer.view')) return <AppShell workspace="Business workspace" selectedKey="customers" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Customer access</span><h1>Your role does not include customer records.</h1><p>Ask your business owner to grant customer viewing permission if you need these details.</p></div></section></PageContainer></AppShell>;
  if (!session.apiAccessToken) redirect('/login' as Route);
  const response = await fetch(new URL('/api/business/customers', process.env.API_URL ?? 'http://localhost:4000'), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (response.status === 401) redirect('/login' as Route);
  if (!response.ok) return <AppShell workspace="Business workspace" selectedKey="customers" navigation={navigation}><PageContainer><section className={styles.workspaceHero}><div><span className={styles.workspaceEyebrow}>Customer records unavailable</span><h1>We could not load your customers.</h1><p>Your saved records are safe. Refresh this page or try again shortly.</p></div></section></PageContainer></AppShell>;
  const customers = await response.json() as BusinessCustomer[];
  return <AppShell workspace="Business workspace" selectedKey="customers" navigation={navigation}><PageContainer><CustomersWorkspace initialCustomers={customers} canManage={permissions.includes('customer.manage')} /></PageContainer></AppShell>;
}
