import { AuthShell } from '../../../components/auth-shell';
import { LoginForm } from '../../login/login-form';

export const metadata = { robots: { index: false, follow: false } };

export default function PlatformLoginPage() { return <AuthShell eyebrow="Platform access" title="Super Admin sign in." description="Platform access is separate from every business workspace."><LoginForm accountType="PLATFORM" /></AuthShell>; }
