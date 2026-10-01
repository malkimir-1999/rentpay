'use client';

import { useState } from 'react';
import { Alert, Button, Card, Input, Space, Tag, message } from 'antd';
import { DateTimeDisplay } from '../../../components/ui';
import styles from './extension-requests.module.css';

export type ExtensionRequestRow = {
  id: string;
  reason: string;
  requestedReturnAt: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';
  decisionNote: string | null;
  createdAt: string;
  rental: { id: string; status: string; expectedReturnAt: string; currency: string; customerName: string; vehicle: { make: string; model: string } };
  customer: { fullName: string; email: string | null; phone: string };
};

export function ExtensionRequests({ initialRequests }: { initialRequests: ExtensionRequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [toast, contextHolder] = message.useMessage();

  async function review(request: ExtensionRequestRow, approve: boolean) {
    setBusyId(request.id);
    setError('');
    try {
      const response = await fetch(`/api/app/rentals/extension-requests/${encodeURIComponent(request.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approve, decisionNote: notes[request.id] ?? '' }),
      });
      const result = await response.json() as ExtensionRequestRow | { error?: { message?: string | string[] } };
      if (!response.ok) {
        const detail = 'error' in result ? result.error?.message : undefined;
        throw new Error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not review this request. Refresh and try again.');
      }
      const updated = result as ExtensionRequestRow;
      setRequests((current) => current.map((entry) => entry.id === updated.id ? {
        ...entry,
        ...updated,
        rental: { ...entry.rental, ...updated.rental },
        customer: { ...entry.customer, ...updated.customer },
      } : entry));
      await toast.success(approve ? 'Return date updated and customer request approved.' : 'Customer request declined with a decision note.');
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'We could not review this request.';
      setError(detail);
      await toast.error(detail);
    } finally {
      setBusyId('');
    }
  }

  if (!requests.length) return null;
  return <section aria-labelledby="extension-requests-title" className={styles.section}>
    {contextHolder}
    <div className={styles.heading}><div><h2 id="extension-requests-title">Return date requests</h2><p>Check availability before approving. Customers are told that a new date is not confirmed until your team approves it.</p></div><Tag>{requests.filter((entry) => entry.status === 'PENDING').length} waiting</Tag></div>
    {error && <Alert type="error" showIcon message={error} />}
    <div className={styles.grid}>{requests.map((request) => <Card key={request.id} title={`${request.customer.fullName} · ${request.rental.vehicle.make} ${request.rental.vehicle.model}`} extra={<Tag color={request.status === 'APPROVED' ? 'green' : request.status === 'PENDING' ? 'gold' : 'default'}>{request.status.toLowerCase()}</Tag>}>
      <Space direction="vertical" size="middle" className={styles.cardContent}>
        <div><strong>Requested return</strong><br /><DateTimeDisplay value={request.requestedReturnAt} /></div>
        <div><strong>Current return</strong><br /><DateTimeDisplay value={request.rental.expectedReturnAt} /></div>
        <p className={styles.requestReason}>{request.reason}</p>
        {request.customer.phone && <a href={`tel:${request.customer.phone}`}>Call renter</a>}
        {request.decisionNote && <Alert type="info" showIcon message="Decision note" description={request.decisionNote} />}
        {request.status === 'PENDING' && <><Input.TextArea aria-label={`Decision note for ${request.customer.fullName}`} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={1000} placeholder="Optional note for the renter" value={notes[request.id] ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} /><Space wrap><Button type="primary" loading={busyId === request.id} disabled={Boolean(busyId)} onClick={() => review(request, true)}>Approve new return time</Button><Button danger loading={busyId === request.id} disabled={Boolean(busyId)} onClick={() => review(request, false)}>Decline request</Button></Space></>}
      </Space>
    </Card>)}</div>
  </section>;
}
