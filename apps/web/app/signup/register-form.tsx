'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Checkbox, Form, Input, Select } from 'antd';
import { countries } from '../../../../packages/config/src/countries';
import { registrationSchema } from '../../../../packages/validation/src/auth';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';

export function RegisterForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  async function submit(values: { name: string; email: string; phone?: string; country: string; businessName: string; password: string; termsAccepted: boolean }) {
    setBusy(true); setMessage('');
    const parsed = registrationSchema.safeParse(values);
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? 'Check the details and try again.'); setBusy(false); return; }
    try {
      const response = await fetch(apiPath('/api/auth/register'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed.data) });
      if (!response.ok) { const result = await response.json() as { error?: { message?: string | string[] } }; const detail = result.error?.message; throw new Error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not create the account. Check the details and try again.'); }
      setComplete(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not create the account. Please try again.'); }
    finally { setBusy(false); }
  }
  if (complete) return <div className={styles.successPanel} role="status"><h2>Your 30-day trial is ready.</h2><p>We sent a verification link to your email. Verify it, then sign in to finish your business setup.</p><Link className={styles.button} href="/login">Go to sign in</Link></div>;
  return <Form className={styles.authForm} layout="vertical" requiredMark={false} initialValues={{ country: 'PK', termsAccepted: false }} onFinish={submit}>
    <Form.Item label="Your name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter your name.' }, { min: 2, max: 100, message: 'Use 2 to 100 characters.' }]}><Input autoComplete="name" /></Form.Item>
    <Form.Item label="Work email" name="email" rules={[{ required: true, message: 'Enter your work email.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" inputMode="email" /></Form.Item>
    <Form.Item label={<span>Phone <span className={styles.optionalLabel}>optional</span></span>} name="phone" rules={[{ max: 32, message: 'Use no more than 32 characters.' }]}><Input type="tel" autoComplete="tel" /></Form.Item>
    <Form.Item label="Business name" name="businessName" rules={[{ required: true, whitespace: true, message: 'Enter your business name.' }, { min: 2, max: 100, message: 'Use 2 to 100 characters.' }]}><Input autoComplete="organization" /></Form.Item>
    <Form.Item label="Country" name="country" rules={[{ required: true }]}><Select options={Object.entries(countries).map(([code, country]) => ({ value: code, label: country.name }))} /></Form.Item>
    <Form.Item label="Password" name="password" extra={<span className={styles.helperText}>Use at least 12 characters.</span>} rules={[{ required: true, message: 'Create a password.' }, { min: 12, max: 256, message: 'Use 12 to 256 characters.' }]}><Input.Password autoComplete="new-password" /></Form.Item>
    <Form.Item className={styles.checkLabel} name="termsAccepted" valuePropName="checked" rules={[{ validator: (_, value: boolean) => value ? Promise.resolve() : Promise.reject(new Error('Please accept the Terms and Privacy Policy to continue.')) }]}><Checkbox>I agree to the <Link href="/legal/terms">Terms</Link> and have read the <Link href="/legal/privacy">Privacy Policy</Link>.</Checkbox></Form.Item>
    {message && <Alert type="error" showIcon message={message} role="alert" />}
    <Button className={styles.submitButton} type="primary" htmlType="submit" loading={busy} block>{busy ? 'Creating your workspace…' : 'Start your 30-day trial'}</Button>
    <div className={styles.authLinks}><span>Already use RentPay?</span><Link href="/login">Log in</Link></div>
  </Form>;
}
