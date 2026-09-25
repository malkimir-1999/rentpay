import { InvitationForm } from './invitation-form';
import { AuthShell } from '../../components/auth-shell';

export const metadata = { robots: { index: false, follow: false } };

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <AuthShell eyebrow="Team invitation" title="Join your rental team." description="Check the business and role before accepting. Your access follows the permissions set by the business owner.">{token ? <InvitationForm token={token} /> : <p role="alert">This invitation link is missing. Ask your business owner to send a new one.</p>}</AuthShell>;
}
