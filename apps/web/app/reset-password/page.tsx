import { ResetForm } from './reset-form';
import { AuthShell } from '../../components/auth-shell';
export const metadata = { robots: { index: false, follow: false } };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell eyebrow="Account recovery" title="Choose a new password." description="Use at least 12 characters, then sign in with your new password.">{token ? <ResetForm token={token} /> : <p role="alert">This reset link is missing or invalid. Request a new link to continue.</p>}</AuthShell>; }
