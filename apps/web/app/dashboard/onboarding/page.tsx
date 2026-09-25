import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './onboarding-form';
export const metadata = { title: 'Set up your business', robots: { index: false, follow: false } };
export default async function BusinessOnboardingPage() {
  const session = await auth();
  if (!session?.user || session.user.accountType !== 'BUSINESS' || !session.apiAccessToken) redirect('/login');
  const response = await fetch(new URL('/api/business/onboarding', process.env.API_URL ?? 'http://localhost:4000'), { headers: { authorization: `Bearer ${session.apiAccessToken}` }, cache: 'no-store' });
  if (!response.ok) redirect('/login');
  const setup = await response.json() as Parameters<typeof OnboardingForm>[0]['initialSetup'];
  return <OnboardingForm token={session.apiAccessToken} initialSetup={setup} />;
}
