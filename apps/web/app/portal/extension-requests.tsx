'use client';

import { useState } from 'react';
import styles from './portal.module.css';

type Rental = { id: string; expectedReturnAt: string; vehicle: { make: string; model: string }; business: { name: string } };
type ExtensionRequest = { id: string; requestedReturnAt: string; reason: string; status: string; decisionNote: string | null; rental: { vehicle: { make: string; model: string }; business: { name: string } } };

export function ExtensionRequests({ rentals, initialRequests }: { rentals: Rental[]; initialRequests: ExtensionRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [rentalId, setRentalId] = useState(rentals[0]?.id ?? '');
  const [requestedReturnAt, setRequestedReturnAt] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/portal/rentals/${encodeURIComponent(rentalId)}/extension-requests`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestedReturnAt: new Date(requestedReturnAt).toISOString(), reason }),
      });
      const result = await response.json() as ExtensionRequest | { error?: { message?: string } };
      if (!response.ok) throw new Error('error' in result ? result.error?.message : undefined);
      setMessage('Your request has been sent. The rental team will confirm if the vehicle is available.');
      setReason('');
      const refresh = await fetch('/api/portal/extension-requests', { cache: 'no-store' });
      if (refresh.ok) setRequests(await refresh.json() as ExtensionRequest[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!rentals.length && !requests.length) return null;
  return <section className={styles.section} aria-labelledby="extension-title">
    <div className={styles.sectionHeading}><div><h2 id="extension-title">Return date requests</h2><p>Ask the rental team to extend an upcoming or active rental. It is not confirmed until they approve it.</p></div></div>
    {rentals.length > 0 && <form className={styles.extensionForm} onSubmit={submit}>
      <label>Rental<select value={rentalId} onChange={(event) => setRentalId(event.target.value)}>{rentals.map((rental) => <option key={rental.id} value={rental.id}>{rental.vehicle.make} {rental.vehicle.model} · {rental.business.name}</option>)}</select></label>
      <label>Requested return date and time<input required type="datetime-local" value={requestedReturnAt} onChange={(event) => setRequestedReturnAt(event.target.value)} /></label>
      <label>Why do you need more time?<textarea required minLength={8} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <button type="submit" disabled={busy || !rentalId}>{busy ? 'Sending…' : 'Request more time'}</button>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </form>}
    {requests.length > 0 && <div className={styles.cards}>{requests.map((request) => <article className={styles.card} key={request.id}><div className={styles.cardHeading}><div><strong>{request.rental.vehicle.make} {request.rental.vehicle.model}</strong><span>{request.rental.business.name}</span></div><span className={styles.status}>{request.status.toLowerCase()}</span></div><p>Requested return: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.requestedReturnAt))}</p><p>{request.reason}</p>{request.decisionNote && <p>{request.decisionNote}</p>}</article>)}</div>}
  </section>;
}
