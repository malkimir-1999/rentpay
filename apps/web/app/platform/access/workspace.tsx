'use client';

import { useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Tag, message } from 'antd';
import { MoneyDisplay, PageHeader } from '../../../components/ui';
import styles from './workspace.module.css';

type Business = { id: string; name: string; slug: string; country: string; createdAt: string; _count: { memberships: number; vehicles: number; customers: number }; subscriptions: Array<{ status: string; trialEndsAt: string | null; activatedAt: string | null; plan: { name: string; amountMinor: number; currency: string } }> };
type PendingPayment = { id: string; status: string; method: string; reference: string | null; amountMinor: number | null; createdAt: string; requestedPlan: { name: string; amountMinor: number; currency: string } | null; subscription: { business: { name: string; slug: string }; plan: { name: string } } };
type Plan = { id: string; key: string; name: string; amountMinor: number; currency: string; vehicleLimit: number | null; staffLimit: number | null; features: string[]; isPurchasable: boolean };
type AuditRow = { id: string; businessId: string | null; actorUserId: string | null; action: string; entityType: string; entityId: string | null; createdAt: string };
export type PlatformData = { overview: { businesses: number; users: number; activeSubscriptions: number; trials: number; pendingPayments: number; overdueTrials: number }; businesses: Business[]; pendingPayments: PendingPayment[]; plans: Plan[]; audit: AuditRow[] };

async function createPlan(body: unknown) {
  const response = await fetch('/api/platform/plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const data = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
  if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'The plan could not be created.');
}

export function PlatformWorkspace({ initialData }: { initialData: PlatformData }) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  async function review(id: string, approve: boolean) {
    setBusy(id); setError('');
    try {
      const response = await fetch(`/api/platform/subscription-payments/${encodeURIComponent(id)}/review`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approve }), cache: 'no-store' });
      const result = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
      if (!response.ok) throw new Error(result?.error?.message ?? result?.message ?? 'The payment decision could not be saved.');
      setData((current) => ({ ...current, pendingPayments: current.pendingPayments.filter((payment) => payment.id !== id), overview: { ...current.overview, pendingPayments: Math.max(0, current.overview.pendingPayments - 1), activeSubscriptions: current.overview.activeSubscriptions + (approve ? 1 : 0) } }));
      messageApi.success(approve ? 'Payment approved and subscription activated.' : 'Payment rejected.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The payment decision could not be saved.'); }
    finally { setBusy(''); }
  }

  async function onCreatePlan(values: { key: string; name: string; price: number; vehicleLimit?: number; staffLimit?: number }) {
    setBusy('plan'); setError('');
    try {
      await createPlan({ key: values.key.trim().toUpperCase(), name: values.name.trim(), amountMinor: Math.round(values.price * 100), currency: 'PKR', vehicleLimit: values.vehicleLimit, staffLimit: values.staffLimit });
      const response = await fetch('/api/platform/plans', { cache: 'no-store' });
      if (!response.ok) throw new Error('The plan was saved, but the updated list could not be loaded. Refresh this page.');
      const plans = await response.json() as Plan[];
      setData((current) => ({ ...current, plans }));
      messageApi.success('Plan created.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The plan could not be created.'); }
    finally { setBusy(''); }
  }

  return <div className={styles.page}>
    {contextHolder}
    <PageHeader title="Platform overview" description="A live view of RentPay businesses, subscriptions and items waiting for review." />
    {error && <Alert type="error" showIcon closable message={error} onClose={() => setError('')} />}
    <section className={styles.metrics} aria-label="Platform totals">
      {Object.entries({ Businesses: data.overview.businesses, Users: data.overview.users, 'Paid subscriptions': data.overview.activeSubscriptions, 'Active trials': data.overview.trials, 'Payments to review': data.overview.pendingPayments, 'Trials past end date': data.overview.overdueTrials }).map(([label, value]) => <article className={styles.metric} key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <section className={styles.section} aria-labelledby="payments-title">
      <div className={styles.heading}><div><h2 id="payments-title">Subscription payments to review</h2><p>Confirm the reference against your receiving account before approving.</p></div><Tag>{data.pendingPayments.length} waiting</Tag></div>
      {data.pendingPayments.length ? <div className={styles.list}>{data.pendingPayments.map((payment) => <article className={styles.payment} key={payment.id}>
        <div><strong>{payment.subscription.business.name}</strong><span>{payment.requestedPlan?.name ?? payment.subscription.plan.name} · {payment.method.replaceAll('_', ' ')}</span><small>Reference: {payment.reference || 'Not provided'} · Submitted {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(payment.createdAt))}</small></div>
        <strong>{payment.amountMinor === null ? 'Amount not supplied' : <MoneyDisplay amountMinor={payment.amountMinor} currency={payment.requestedPlan?.currency ?? 'PKR'} />}</strong>
        <div className={styles.actions}><Button type="primary" loading={busy === payment.id} disabled={Boolean(busy)} onClick={() => void review(payment.id, true)}>Approve & activate</Button><Button danger loading={busy === payment.id} disabled={Boolean(busy)} onClick={() => void review(payment.id, false)}>Reject</Button></div>
      </article>)}</div> : <p>No payment submissions are waiting for review.</p>}
    </section>
    <section className={styles.section} aria-labelledby="businesses-title">
      <div className={styles.heading}><div><h2 id="businesses-title">Businesses</h2><p>Workspace usage and current subscription status.</p></div></div>
      {data.businesses.length ? <div className={styles.list}>{data.businesses.map((business) => { const subscription = business.subscriptions[0]; return <article className={styles.business} key={business.id}><div><strong>{business.name}</strong><span>/rentals/{business.slug} · {business.country}</span></div><Tag color={subscription?.status === 'ACTIVE' ? 'green' : 'default'}>{subscription?.status?.replaceAll('_', ' ') ?? 'No subscription'}</Tag><span>{subscription?.plan.name ?? '—'}</span><span>{business._count.vehicles} vehicles · {business._count.memberships} staff</span><time>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(business.createdAt))}</time></article>; })}</div> : <p>No businesses have registered yet.</p>}
    </section>
    <section className={styles.section} aria-labelledby="plans-title">
      <div className={styles.heading}><div><h2 id="plans-title">Subscription plans</h2><p>Prices are shown in PKR. Plans you create become available to businesses.</p></div></div>
      <div className={styles.planGrid}>{data.plans.map((plan) => <article className={styles.plan} key={plan.id}><div><strong>{plan.name}</strong><Tag>{plan.isPurchasable ? 'Available' : 'Hidden'}</Tag></div><p><MoneyDisplay amountMinor={plan.amountMinor} currency={plan.currency} /></p><span>{plan.vehicleLimit ?? 'No'} vehicle limit · {plan.staffLimit ?? 'No'} staff limit</span></article>)}</div>
      <details className={styles.createPlan}><summary>Create a plan</summary><Form layout="vertical" onFinish={onCreatePlan} className={styles.planForm}><Form.Item label="Plan key" name="key" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]{2,32}$/, message: 'Use 2–32 letters, numbers, dashes or underscores.' }]}><Input placeholder="STARTER" maxLength={32} /></Form.Item><Form.Item label="Plan name" name="name" rules={[{ required: true, min: 2 }]}><Input placeholder="Starter" maxLength={100} /></Form.Item><Form.Item label="Monthly price (PKR)" name="price" rules={[{ required: true }]}><InputNumber min={1} precision={2} className={styles.fullWidth} /></Form.Item><Form.Item label="Vehicle limit (optional)" name="vehicleLimit"><InputNumber min={1} precision={0} className={styles.fullWidth} /></Form.Item><Form.Item label="Staff limit (optional)" name="staffLimit"><InputNumber min={1} precision={0} className={styles.fullWidth} /></Form.Item><Button htmlType="submit" type="primary" loading={busy === 'plan'} disabled={Boolean(busy)}>Create plan</Button></Form></details>
    </section>
    <section className={styles.section} aria-labelledby="audit-title"><div className={styles.heading}><div><h2 id="audit-title">Recent platform activity</h2><p>Latest recorded security and business events.</p></div></div>{data.audit.length ? <ol className={styles.audit}>{data.audit.slice(0, 12).map((event) => <li key={event.id}><strong>{event.action.replaceAll('_', ' ').toLowerCase()}</strong><span>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ''}</span><time>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}</time></li>)}</ol> : <p>No platform activity recorded yet.</p>}</section>
  </div>;
}
