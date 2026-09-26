'use client';

import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Modal, message } from 'antd';
import type { Dayjs } from 'dayjs';
import { MoneyDisplay } from '../../../components/ui';
import styles from './public-booking.module.css';

type Vehicle = { id: string; make: string; model: string; variant: string | null; year: number | null; category: string | null; seats: number | null; transmission: string | null; fuelType: string | null; dailyRateMinor: number; depositMinor: number; currency: string; location: { id: string; name: string } | null };
type SearchValues = { dates: [Dayjs, Dayjs] };
type RequestValues = { fullName: string; email: string; phone: string; notes?: string };
type Availability = { startAt: string; endAt: string; billableDays: number; vehicles: Vehicle[] };
function getMessage(payload: unknown) { const value = (payload as { error?: { message?: string | string[] } } | null)?.error?.message; return Array.isArray(value) ? value[0] : value ?? 'We could not complete your request. Please try again.'; }

export function PublicBooking({ slug }: { slug: string }) {
  const [searchForm] = Form.useForm<SearchValues>();
  const [requestForm] = Form.useForm<RequestValues>();
  const [availability, setAvailability] = useState<Availability>();
  const [selected, setSelected] = useState<Vehicle>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, contextHolder] = message.useMessage();

  async function search(values: SearchValues) {
    setBusy(true); setError(''); setSuccess('');
    const query = new URLSearchParams({ startAt: values.dates[0].toDate().toISOString(), endAt: values.dates[1].toDate().toISOString() });
    try {
      const response = await fetch(`/api/public/rentals/${encodeURIComponent(slug)}/availability?${query}`, { cache: 'no-store' });
      const result = await response.json() as Availability | { error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(getMessage(result));
      setAvailability(result as Availability);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Availability is temporarily unavailable.'); }
    finally { setBusy(false); }
  }

  async function submitRequest(values: RequestValues) {
    if (!selected || !availability) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/public/rentals/${encodeURIComponent(slug)}/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vehicleId: selected.id, startAt: availability.startAt, endAt: availability.endAt, ...values }) });
      const result = await response.json() as { message?: string; error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(getMessage(result));
      setSuccess(result.message ?? 'Your request has been sent to the rental team.'); setSelected(undefined); requestForm.resetFields(); await toast.success('Request sent. The rental team will follow up.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not send your request.'); }
    finally { setBusy(false); }
  }

  return <section className={styles.booking} id="booking">
    {contextHolder}
    <div className={styles.intro}><span className={styles.eyebrow}>Check dates</span><h2>Find a car for your trip</h2><p>Choose your dates to see which vehicles may be available. The business confirms every request before it is booked.</p></div>
    <Card className={styles.searchCard}>
      <Form form={searchForm} layout="vertical" onFinish={(values) => void search(values)}>
        <Form.Item label="Pickup and return" name="dates" rules={[{ required: true, message: 'Choose your pickup and return times.' }]}><DatePicker.RangePicker className={styles.fullWidth} showTime format="DD MMM YYYY, h:mm a" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy}>Check availability</Button>
      </Form>
    </Card>
    {error ? <Alert className={styles.feedback} type="error" showIcon message={error} /> : null}
    {success ? <Alert className={styles.feedback} type="success" showIcon message={success} /> : null}
    {availability ? <div className={styles.results} aria-live="polite">
      <div className={styles.resultHeading}><h3>{availability.vehicles.length ? `${availability.vehicles.length} vehicles to choose from` : 'No vehicles available for these dates'}</h3><p>Estimated rates only. The rental team will confirm your request.</p></div>
      {availability.vehicles.length ? <div className={styles.vehicleGrid}>{availability.vehicles.map((vehicle) => <Card key={vehicle.id} className={styles.vehicleCard}>
        <div className={styles.vehicleArt} aria-hidden="true"><span>{vehicle.make.slice(0, 1)}</span></div>
        <div className={styles.vehicleInfo}><span className={styles.vehicleMeta}>{vehicle.category ?? 'Rental vehicle'}{vehicle.year ? ` · ${vehicle.year}` : ''}</span><h4>{vehicle.make} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ''}</h4>
          <p>{vehicle.seats ? `${vehicle.seats} seats` : 'Details confirmed by the rental team'}{vehicle.transmission ? ` · ${vehicle.transmission.toLowerCase()}` : ''}</p>
          <div className={styles.vehiclePrice}><span><MoneyDisplay amountMinor={vehicle.dailyRateMinor} currency={vehicle.currency} /> <small>/ day</small></span><Button type="primary" onClick={() => { setError(''); setSelected(vehicle); }}>Request this car</Button></div>
          {vehicle.depositMinor > 0 ? <small className={styles.deposit}>Security deposit: <MoneyDisplay amountMinor={vehicle.depositMinor} currency={vehicle.currency} /></small> : null}
        </div>
      </Card>)}</div> : <Empty description="Try another date range, or contact the rental team for help." />}
    </div> : null}
    <Modal title={selected ? `Request ${selected.make} ${selected.model}` : 'Request a vehicle'} open={Boolean(selected)} onCancel={() => setSelected(undefined)} footer={null} destroyOnHidden>
      {selected ? <Form form={requestForm} layout="vertical" requiredMark={false} onFinish={(values) => void submitRequest(values)}>
        <p className={styles.modalHelp}>This takes a minute. Your request is not confirmed until the business contacts you.</p>
        <Form.Item label="Your name" name="fullName" rules={[{ required: true, min: 2, max: 100, whitespace: true }]}><Input autoComplete="name" maxLength={100} /></Form.Item>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input type="email" autoComplete="email" inputMode="email" maxLength={254} /></Form.Item>
        <Form.Item label="Phone number" name="phone" rules={[{ required: true, min: 7, max: 32 }]}><Input type="tel" autoComplete="tel" maxLength={32} /></Form.Item>
        <Form.Item label="Note for the rental team (optional)" name="notes"><Input.TextArea rows={3} maxLength={1000} showCount /></Form.Item>
        {error ? <Alert className={styles.feedback} type="error" showIcon message={error} /> : null}
        <Button type="primary" htmlType="submit" loading={busy} block>Send booking request</Button>
      </Form> : null}
    </Modal>
  </section>;
}
