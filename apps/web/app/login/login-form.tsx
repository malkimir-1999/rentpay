'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import styles from '../marketing.module.css';
import { apiPath } from '../../lib/api-client';

export function LoginForm({ accountType = 'BUSINESS' }: { accountType?: 'BUSINESS' | 'CUSTOMER' | 'PLATFORM' }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(values: { email: string; password: string }) {
    setBusy(true); setMessage('');
    try {
      const result = await signIn('credentials', { email: values.email, password: values.password, accountType, redirect: false });
      if (!result || result.error) throw new Error('We could not sign you in. Check your email and password, or verify your email first.');
      const session = await getSession();
      if (!session?.apiAccessToken) throw new Error('Your session could not be started. Please try again.');
      if (accountType === 'CUSTOMER') { router.replace('/portal'); router.refresh(); return; }
      if (accountType === 'PLATFORM') { router.replace('/platform/access' as Route); router.refresh(); return; }
      if (!session.user.permissions?.includes('settings.manage')) { router.replace('/app/today'); router.refresh(); return; }
      const setupResponse = await fetch(apiPath('/api/business/onboarding'), {
        headers: { authorization: `Bearer ${session.apiAccessToken}` },
        cache: 'no-store',
      });
      if (!setupResponse.ok) throw new Error('Your workspace could not be loaded. Please try signing in again.');
      const setup = await setupResponse.json() as { settings: { onboardingCompletedAt: string | null } };
      router.replace(setup.settings.onboardingCompletedAt ? '/app/today' : '/dashboard/onboarding');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not sign you in. Please try again.'); }
    finally { setBusy(false); }
  }
  return <Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={submit} autoComplete="on">
    <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email address.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="username" inputMode="email" /></Form.Item>
    <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password.' }]}><Input.Password autoComplete="current-password" /></Form.Item>
    {message && <Alert type="error" showIcon message={message} role="alert" />}
    <Button className={styles.submitButton} type="primary" htmlType="submit" loading={busy} block>{busy ? 'Signing in…' : 'Sign in'}</Button>
    <div className={styles.authLinks}><Link href="/forgot-password">Forgot password?</Link><Link href="/verify-email">Verify email</Link></div>
    <div className={styles.authLinks}><span>New to RentPay?</span><Link href="/register">Start a free trial</Link></div>
  </Form>;
}
