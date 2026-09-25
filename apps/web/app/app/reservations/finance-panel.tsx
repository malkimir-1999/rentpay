'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Spin, Tag, message } from 'antd';
import { MoneyDisplay } from '../../../components/ui';
import styles from './finance-panel.module.css';

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH' | 'ONLINE_GATEWAY' | 'OTHER';
type DepositType = 'COLLECTED' | 'REFUNDED' | 'RETAINED';
type Ledger = { currency: string; paymentTotalMinor: number; depositHeldMinor: number; payments: Array<{ id: string; amountMinor: number; currency: string; type: 'RECEIVED' | 'REFUNDED'; method: PaymentMethod; reference: string | null; note: string | null; createdAt: string }>; deposits: Array<{ id: string; amountMinor: number; currency: string; type: DepositType; reason: string | null; createdAt: string }> };
type PaymentValues = { amount: number; type: 'RECEIVED' | 'REFUNDED'; method: PaymentMethod; reference?: string; note?: string };
type DepositValues = { amount: number; type: DepositType; reason: string };

const paymentMethods = [{ value: 'CASH', label: 'Cash' }, { value: 'BANK_TRANSFER', label: 'Bank transfer' }, { value: 'EASYPAISA', label: 'Easypaisa' }, { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'ONLINE_GATEWAY', label: 'Online gateway' }, { value: 'OTHER', label: 'Other' }];
const paymentTypes = [{ value: 'RECEIVED', label: 'Payment received' }, { value: 'REFUNDED', label: 'Refund issued' }];
const depositTypes = [{ value: 'COLLECTED', label: 'Collect deposit' }, { value: 'REFUNDED', label: 'Refund deposit' }, { value: 'RETAINED', label: 'Retain for charges' }];
function amountMinor(amount: number) { return Math.round(amount * 100); }
function errorMessage(value: unknown) { const message = (value as { error?: { message?: string | string[] } } | null)?.error?.message; return (Array.isArray(message) ? message[0] : message) ?? 'We could not save this record. Please try again.'; }

export function ReservationFinancePanel({ reservationId, canRecordPayments, canManageDeposits }: { reservationId: string; canRecordPayments: boolean; canManageDeposits: boolean }) {
  const [ledger, setLedger] = useState<Ledger>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, contextHolder] = message.useMessage();
  const [paymentForm] = Form.useForm<PaymentValues>();
  const [depositForm] = Form.useForm<DepositValues>();

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/app/reservations/${encodeURIComponent(reservationId)}/ledger`, { cache: 'no-store' });
      const result = await response.json() as Ledger | { error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(errorMessage(result));
      setLedger(result as Ledger); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Financial history is unavailable.'); }
    finally { setLoading(false); }
  }, [reservationId]);

  useEffect(() => { void loadLedger(); }, [loadLedger]);

  async function submit(kind: 'payments' | 'deposits', values: PaymentValues | DepositValues) {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/app/reservations/${encodeURIComponent(reservationId)}/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...values, amountMinor: amountMinor(values.amount) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(result));
      if (kind === 'payments') paymentForm.resetFields(); else depositForm.resetFields();
      await loadLedger(); await toast.success(kind === 'payments' ? 'Payment recorded.' : 'Deposit entry recorded.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'We could not save this record.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  return <section className={styles.panel} aria-label="Payments and deposit ledger">
    {contextHolder}
    <div className={styles.heading}><div><h3>Payments & deposit</h3><p>Rental money is recorded separately from RentPay subscription billing.</p></div></div>
    {error ? <Alert type="error" showIcon message={error} /> : null}
    {loading ? <div className={styles.loading}><Spin size="small" /> Loading financial history…</div> : ledger ? <>
      <div className={styles.totals}><Card size="small"><span>Payments received</span><strong><MoneyDisplay amountMinor={ledger.paymentTotalMinor} currency={ledger.currency} /></strong></Card><Card size="small"><span>Deposit held</span><strong><MoneyDisplay amountMinor={ledger.depositHeldMinor} currency={ledger.currency} /></strong></Card></div>
      {canRecordPayments ? <Card size="small" title="Record a payment" className={styles.entryCard}>
        <Form form={paymentForm} layout="vertical" onFinish={(values) => void submit('payments', values)} initialValues={{ type: 'RECEIVED', method: 'CASH' }}>
          <div className={styles.formGrid}><Form.Item label="Entry" name="type" rules={[{ required: true }]}><Select options={paymentTypes} /></Form.Item><Form.Item label={`Amount (${ledger.currency})`} name="amount" rules={[{ required: true }, { type: 'number', min: 0.01, max: 20000000 }]}><InputNumber min={0.01} precision={2} step={100} className={styles.amountInput} /></Form.Item><Form.Item label="Payment method" name="method" rules={[{ required: true }]}><Select options={paymentMethods} /></Form.Item></div>
          <Form.Item label="Reference (optional)" name="reference"><Input maxLength={160} placeholder="Receipt or transfer reference" /></Form.Item>
          <Form.Item label="Note (optional)" name="note"><Input maxLength={1000} placeholder="Short note for your team" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Save payment</Button>
        </Form>
      </Card> : null}
      {canManageDeposits ? <Card size="small" title="Update security deposit" className={styles.entryCard}>
        <Form form={depositForm} layout="vertical" onFinish={(values) => void submit('deposits', values)} initialValues={{ type: 'COLLECTED' }}>
          <div className={styles.formGrid}><Form.Item label="Action" name="type" rules={[{ required: true }]}><Select options={depositTypes} /></Form.Item><Form.Item label={`Amount (${ledger.currency})`} name="amount" rules={[{ required: true }, { type: 'number', min: 0.01, max: 20000000 }]}><InputNumber min={0.01} precision={2} step={100} className={styles.amountInput} /></Form.Item></div>
          <Form.Item label="Reason" name="reason" rules={[{ required: true, min: 3 }]}><Input maxLength={500} placeholder="For example, deposit collected at pickup" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>Save deposit entry</Button>
        </Form>
      </Card> : null}
      <div className={styles.history}>
        <h4>Recent activity</h4>
        {!ledger.payments.length && !ledger.deposits.length ? <p>No payments or deposit entries recorded yet.</p> : <Space direction="vertical" className={styles.entries}>
          {[...ledger.payments.map((entry) => ({ ...entry, kind: entry.type === 'REFUNDED' ? 'Refund' : 'Payment', title: paymentMethods.find((option) => option.value === entry.method)?.label ?? entry.method })), ...ledger.deposits.map((entry) => ({ ...entry, kind: 'Deposit', title: depositTypes.find((option) => option.value === entry.type)?.label ?? entry.type }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((entry) => <div className={styles.entry} key={`${entry.kind}-${entry.id}`}><div><Tag>{entry.kind}</Tag><strong>{entry.title}</strong><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}</time>{'reason' in entry && entry.reason ? <span>{entry.reason}</span> : 'note' in entry && entry.note ? <span>{entry.note}</span> : null}</div><span className={entry.kind === 'Refund' || ('type' in entry && (entry.type === 'REFUNDED' || entry.type === 'RETAINED')) ? styles.outflow : undefined}>{entry.kind === 'Refund' || ('type' in entry && (entry.type === 'REFUNDED' || entry.type === 'RETAINED')) ? '− ' : '+ '}<MoneyDisplay amountMinor={entry.amountMinor} currency={entry.currency} /></span></div>)}
        </Space>}
      </div>
    </> : null}
  </section>;
}
