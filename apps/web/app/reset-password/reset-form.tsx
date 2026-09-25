'use client';
import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';
export function ResetForm({ token }: { token: string }) {
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 async function submit(values: { password: string; confirmPassword: string }) {
  setBusy(true); setMessage('');
  const password = values.password;
  try {
   const response = await fetch(apiPath('/api/auth/reset-password'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
   setMessage(response.ok ? 'Password updated. You can now sign in.' : 'This reset link is invalid or expired.');
  } catch { setMessage('We could not reach RentPay. Your password was not changed; please try again.'); }
  finally { setBusy(false); }
 }
 return <Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={submit}>
  <Form.Item label="New password" name="password" rules={[{ required: true, message: 'Enter a new password.' }, { min: 12, max: 256, message: 'Use 12 to 256 characters.' }]}><Input.Password autoComplete="new-password" /></Form.Item>
  <Form.Item label="Confirm new password" name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: 'Confirm your new password.' }, { min: 12, message: 'Use at least 12 characters.' }, ({ getFieldValue }) => ({ validator(_, value: string) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match.')); } })]}><Input.Password autoComplete="new-password" /></Form.Item>
  {message && <Alert type={message.startsWith('Password updated') ? 'success' : 'error'} showIcon message={message} role="status" aria-live="polite" />}
  <Button className={styles.submitButton} type="primary" htmlType="submit" loading={busy} block>{busy ? 'Updating…' : 'Update password'}</Button>
 </Form>;
}
