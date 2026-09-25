import { AuthShell } from '../../components/auth-shell';
import { RegisterForm } from '../signup/register-form';
export const metadata = { title: 'Start your 30-day free trial', robots: { index: false, follow: false } };
export default function RegisterPage() { return <AuthShell eyebrow="Start with the essentials" title="Set up your rental workspace." description="Create your owner account. Your 30-day trial starts as soon as your business is registered."><RegisterForm /></AuthShell>; }
