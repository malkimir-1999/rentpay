'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Alert, Button, Card, Empty, Input, Select, Skeleton, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { MoneyDisplay, PageHeader } from '../../../components/ui';
import styles from './availability.module.css';

export type AvailabilityLocation = { id: string; name: string; address: string | null };
type AvailableVehicle = { id: string; make: string; model: string; variant: string | null; year: number | null; registrationNumber: string; category: string | null; seats: number | null; locationId: string | null; dailyRateMinor: number; depositMinor: number; currency: string };
type SearchResult = { startAt: string; endAt: string; billableDays: number; vehicles: AvailableVehicle[] };
function toIso(value: string) { return new Date(value).toISOString(); }
function getDefaultStart() { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(0, 0, 0); return toLocalInput(date); }
function getDefaultEnd() { const date = new Date(Date.now() + 25 * 60 * 60 * 1000); date.setMinutes(0, 0, 0); return toLocalInput(date); }
function toLocalInput(date: Date) { const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return adjusted.toISOString().slice(0, 16); }

export function AvailabilityWorkspace({ locations, canCreateReservation }: { locations: AvailabilityLocation[]; canCreateReservation: boolean }) {
  const [startAt, setStartAt] = useState(getDefaultStart);
  const [endAt, setEndAt] = useState(getDefaultEnd);
  const [locationId, setLocationId] = useState<string>();
  const [result, setResult] = useState<SearchResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    setError(''); setResult(undefined); setLoading(true);
    try {
      if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) throw new Error('Choose a return time after pickup.');
      const params = new URLSearchParams({ startAt: toIso(startAt), endAt: toIso(endAt), ...(locationId ? { locationId } : {}) });
      const response = await fetch(`/api/app/availability?${params}`);
      const payload = await response.json() as SearchResult | { error?: { message?: string | string[] } };
      if (!response.ok) { const detail = (payload as { error?: { message?: string | string[] } }).error?.message; throw new Error((Array.isArray(detail) ? detail[0] : detail) ?? 'We could not check availability.'); }
      setResult(payload as SearchResult);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not check availability.'); }
    finally { setLoading(false); }
  }

  return <section className={styles.workspace}>
    <PageHeader title="Vehicle availability" description="Check free vehicles against reservation dates before you make a promise to a renter." action={canCreateReservation ? <Link className={styles.actionLink} href={'/app/reservations' as Route}>Create reservation</Link> : undefined} />
    <Card className={styles.searchCard}>
      <div className={styles.searchIntro}><div><h2>Check a date range</h2><p>Availability is checked again by the server when a reservation is saved.</p></div></div>
      <div className={styles.searchFields}>
        <label className={styles.field}><span>Pickup date and time</span><Input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
        <label className={styles.field}><span>Return date and time</span><Input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
        <label className={styles.field}><span>Pickup location</span><Select allowClear value={locationId} onChange={setLocationId} placeholder="Any location" options={locations.map((location) => ({ value: location.id, label: location.name }))} /></label>
        <Button type="primary" icon={<SearchOutlined />} onClick={() => void search()} loading={loading}>Check availability</Button>
      </div>
      {error ? <Alert className={styles.error} type="error" showIcon message={error} /> : null}
    </Card>
    {loading ? <div className={styles.loading}><Skeleton active /><Skeleton active /></div> : null}
    {result ? <>
      <div className={styles.resultsHeading}><div><h2>{result.vehicles.length} {result.vehicles.length === 1 ? 'vehicle is' : 'vehicles are'} available</h2><p>For {result.billableDays} billable {result.billableDays === 1 ? 'day' : 'days'} in the selected window.</p></div><Tag color="green">Live schedule check</Tag></div>
      {result.vehicles.length ? <div className={styles.vehicleGrid}>{result.vehicles.map((vehicle) => <Card key={vehicle.id} className={styles.vehicleCard}>
        <div className={styles.vehicleHead}><span className={styles.vehicleIcon} aria-hidden="true">{vehicle.make.slice(0, 1)}</span><div><h3>{vehicle.make} {vehicle.model}</h3><p>{vehicle.variant || vehicle.category || 'Rental vehicle'}{vehicle.year ? ` · ${vehicle.year}` : ''}</p></div><Tag color="green">Available</Tag></div>
        <dl><div><dt>Registration</dt><dd>{vehicle.registrationNumber}</dd></div><div><dt>Seats</dt><dd>{vehicle.seats ?? 'Not set'}</dd></div><div><dt>Daily rate</dt><dd><MoneyDisplay amountMinor={vehicle.dailyRateMinor} currency={vehicle.currency} /></dd></div><div><dt>Deposit</dt><dd><MoneyDisplay amountMinor={vehicle.depositMinor} currency={vehicle.currency} /></dd></div></dl>
        {canCreateReservation ? <Link className={styles.reserveLink} href={'/app/reservations' as Route}>Create booking request</Link> : null}
      </Card>)}</div> : <Card className={styles.emptyCard}><Empty description="No ready vehicles are free for those dates. Try a different time or location." /></Card>}
    </> : !loading ? <Card className={styles.emptyCard}><Empty description="Choose dates and check availability to see vehicles." /></Card> : null}
  </section>;
}
