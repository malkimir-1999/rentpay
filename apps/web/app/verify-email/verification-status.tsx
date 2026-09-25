'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';
export function VerificationStatus({ token }: { token?: string }) {
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function verify() {
    if (!token) return;
    setBusy(true); setMessage('');
    try { const response = await fetch(apiPath('/api/auth/verify-email'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) }); if (!response.ok) throw new Error('This link is invalid, expired or already used. Request a new verification email.'); setVerified(true); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'We could not verify this email.'); }
    finally { setBusy(false); }
  }
  async function resend(values: { email: string }) {
    setBusy(true); setMessage('');
    try { await fetch(apiPath('/api/auth/verify-email/resend'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }); }
    catch { /* The user-facing response intentionally stays generic. */ }
    setMessage('If verification is available for that address, a new link will be sent.'); setBusy(false);
  }
  if (verified) return <div className={styles.successPanel} role="status"><h2>Email verified.</h2><p>Your account is ready. Sign in to continue setting up your business.</p><Link className={styles.button} href="/login">Sign in</Link></div>;
  return <div className={styles.verificationActions}>{token && <><Button className={styles.submitButton} type="primary" onClick={verify} loading={busy} block>{busy ? 'Verifying…' : 'Verify email'}</Button><span className={styles.verificationDivider}>or request a new link</span></>}{message && <Alert type={message.startsWith('If verification') ? 'success' : 'error'} showIcon message={message} role="status" aria-live="polite" />}<p className={styles.helperText}>Need another link? Enter your email and we’ll send one if verification is available.</p><Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={resend}><Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email address.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" inputMode="email" /></Form.Item><Button className={styles.submitButton} type="default" htmlType="submit" loading={busy} block>{busy ? 'Sending…' : 'Resend verification email'}</Button></Form></div>;
}
