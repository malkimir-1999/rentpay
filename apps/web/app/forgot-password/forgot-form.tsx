'use client';
import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';
export function ForgotForm() {
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 async function submit(values: { email: string }) {
  setBusy(true);
  try { await fetch(apiPath('/api/auth/forgot-password'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) }); }
  catch { /* Keep the response generic to prevent account enumeration. */ }
  setMessage('If an account matches, reset instructions will be sent.'); setBusy(false);
 }
 return <Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={submit}><Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email address.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" inputMode="email" /></Form.Item><Button className={styles.submitButton} type="primary" htmlType="submit" loading={busy} block>{busy ? 'Sending…' : 'Send instructions'}</Button>{message && <Alert type="success" showIcon message={message} role="status" aria-live="polite" />}</Form>;
}
