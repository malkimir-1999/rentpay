import { AuthShell } from '../../components/auth-shell';
import { VerificationStatus } from './verification-status';
export const metadata = { title: 'Verify your email', robots: { index: false, follow: false } };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell eyebrow="Confirm your account" title={token ? 'Verify your email.' : 'Check your email.'} description="Confirm your email address to securely sign in and continue setting up your business."><VerificationStatus token={token} /></AuthShell>; }
