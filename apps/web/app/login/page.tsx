import { AuthShell } from '../../components/auth-shell';
import { LoginForm } from './login-form';
export const metadata = { title: 'Log in', robots: { index: false, follow: false } };
export default function LoginPage() { return <AuthShell eyebrow="Welcome back" title="Sign in to your workspace." description="Use your business account email and password to continue."><LoginForm /></AuthShell>; }
