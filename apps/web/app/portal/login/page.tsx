import { AuthShell } from '../../../components/auth-shell';
import { LoginForm } from '../../login/login-form';
export const metadata = { title: 'Customer sign in', robots: { index: false, follow: false } };
export default function CustomerLoginPage() { return <AuthShell eyebrow="Customer account" title="Sign in to your rentals." description="Use the email and password connected to your customer account."><LoginForm accountType="CUSTOMER" /></AuthShell>; }
