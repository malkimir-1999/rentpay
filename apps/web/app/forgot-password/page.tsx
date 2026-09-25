import { ForgotForm } from './forgot-form';
import { AuthShell } from '../../components/auth-shell';
export const metadata = { title: 'Reset your password', robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthShell eyebrow="Account recovery" title="Reset your password." description="Enter your email. If an account matches, we’ll send reset instructions."><ForgotForm /></AuthShell>; }
