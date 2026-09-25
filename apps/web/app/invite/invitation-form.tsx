'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';
type Details = { email: string; businessName: string; roleName: string; existingUser: boolean };
export function InvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<Details | null>(null);
  const [message, setMessage] = useState('Checking your invitation…');
  const [pending, setPending] = useState(false);
  useEffect(() => { let active = true; fetch(apiPath(`/api/auth/invite/${encodeURIComponent(token)}`), { cache: 'no-store' }).then(async (response) => { if (!response.ok) throw new Error('This invitation is invalid or has expired. Ask your business owner for a new one.'); const value = await response.json() as Details; if (active) { setDetails(value); setMessage(''); } }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : 'We could not check this invitation.'); }); return () => { active = false; }; }, [token]);
  async function accept(values: { name?: string; password: string }) {
    if (!details) return;
    setPending(true); setMessage('');
    const password = values.password;
    try {
      const response = await fetch(apiPath('/api/auth/invite/accept'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password, name: values.name }) });
      if (!response.ok) throw new Error('We could not accept this invitation. It may have expired or already been used.');
      const login = await signIn('credentials', { email: details.email, password, accountType: 'BUSINESS', redirect: false });
      if (!login || login.error) throw new Error('Invitation accepted. Sign in with your account password to continue.');
      router.replace('/app/today'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not accept this invitation. Please try again.'); }
    finally { setPending(false); }
  }
  if (!details) return <p className={styles.authMessage} role="status">{message}</p>;
  return <><div className={styles.inviteSummary}><strong>{details.businessName}</strong><span>{details.email}</span><span>Role: {details.roleName}</span></div><Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={accept}>{!details.existingUser && <Form.Item label="Your name" name="name" rules={[{ required: true, message: 'Enter your name.' }, { min: 2, max: 100, message: 'Use 2 to 100 characters.' }]}><Input autoComplete="name" /></Form.Item>}<Form.Item label={details.existingUser ? 'Your account password' : 'Create a password'} name="password" rules={[{ required: true, message: 'Enter your password.' }, { min: 12, max: 256, message: 'Use 12 to 256 characters.' }]}><Input.Password autoComplete={details.existingUser ? 'current-password' : 'new-password'} /></Form.Item>{message && <Alert type="error" showIcon message={message} role="alert" />}<Button className={styles.submitButton} type="primary" htmlType="submit" loading={pending} block>{pending ? 'Joining workspace…' : 'Accept invitation'}</Button></Form></>;
}
