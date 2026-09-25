'use client';
import { useState } from 'react';
import { Alert, Button, Form, Input, InputNumber } from 'antd';
import { apiPath } from '../../lib/api-client';
import styles from '../marketing.module.css';
export function ContactForm() {
  const [message, setMessage] = useState(''); const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(values: { name: string; email: string; businessName?: string; fleetSize?: number; message: string }) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(apiPath('/api/public/contact'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json() as { message?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'We could not send your message. Please try again.');
      setSent(true); setMessage(result.message ?? 'Thanks for contacting RentPay.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not send your message. Please try again.'); }
    finally { setBusy(false); }
  }
  if (sent) return <div className={styles.successPanel} role="status"><h2>Message sent.</h2><p>{message}</p></div>;
  return <Form className={styles.authForm} layout="vertical" requiredMark={false} onFinish={submit}>
    <Form.Item label="Your name" name="name" rules={[{ required: true, message: 'Enter your name.' }, { min: 2, max: 100, message: 'Use 2 to 100 characters.' }]}><Input autoComplete="name" /></Form.Item>
    <Form.Item label="Work email" name="email" rules={[{ required: true, message: 'Enter your work email.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" inputMode="email" /></Form.Item>
    <Form.Item label={<span>Business name <span className={styles.optionalLabel}>optional</span></span>} name="businessName" rules={[{ max: 120, message: 'Use no more than 120 characters.' }]}><Input autoComplete="organization" /></Form.Item>
    <Form.Item label={<span>Fleet size <span className={styles.optionalLabel}>optional</span></span>} name="fleetSize" rules={[{ type: 'number', min: 1, message: 'Enter at least 1 vehicle.' }]}><InputNumber min={1} precision={0} className={styles.fullWidth} /></Form.Item>
    <Form.Item label="What would you like to know?" name="message" rules={[{ required: true, message: 'Tell us what you would like to know.' }, { min: 10, max: 3000, message: 'Use 10 to 3,000 characters.' }]}><Input.TextArea className={styles.contactTextarea} rows={5} showCount maxLength={3000} /></Form.Item>
    {message && <Alert type="error" showIcon message={message} role="alert" />}
    <Button className={styles.submitButton} type="primary" htmlType="submit" loading={busy} block>{busy ? 'Sending…' : 'Send message'}</Button>
  </Form>;
}
