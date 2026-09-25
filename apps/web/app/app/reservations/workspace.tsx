'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { DateTimeDisplay, MoneyDisplay, PageHeader } from '../../../components/ui';
import styles from './reservations.module.css';
import { ReservationFinancePanel } from './finance-panel';

type Status = 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'CONVERTED_TO_RENTAL' | 'CANCELLED' | 'DECLINED' | 'NO_SHOW' | 'EXPIRED';
type Verify = 'NOT_REVIEWED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ReservationCustomer = { id: string; fullName: string; email: string | null; phone: string; status: 'ACTIVE' | 'RESTRICTED'; verification: Verify };
export type ReservationLocation = { id: string; name: string; address: string | null; phone: string | null };
type ReservationVehicle = { id: string; make: string; model: string; registrationNumber: string; locationId: string | null };
export type ReservationRow = { id: string; status: Status; source: 'STAFF' | 'PUBLIC'; startAt: string; endAt: string; dailyRateMinor: number; estimatedTotalMinor: number; depositMinor: number; currency: string; customerName: string; customerPhone: string; customerEmail: string | null; notes: string | null; statusReason: string | null; createdAt: string; customer: Pick<ReservationCustomer, 'id' | 'fullName' | 'phone' | 'email' | 'verification'>; vehicle: ReservationVehicle; pickupLocation: Pick<ReservationLocation, 'id' | 'name'>; dropoffLocation: Pick<ReservationLocation, 'id' | 'name'> | null };
type VehicleOption = { id: string; make: string; model: string; variant: string | null; year: number | null; registrationNumber: string; category: string | null; seats: number | null; locationId: string | null; dailyRateMinor: number; depositMinor: number; currency: string };
type Values = { customerId: string; pickupLocationId: string; dropoffLocationId?: string; startAt: string; endAt: string; notes?: string };

const labels: Record<Status, string> = { PENDING: 'Pending review', CONFIRMED: 'Confirmed', READY_FOR_PICKUP: 'Ready for pickup', CONVERTED_TO_RENTAL: 'Converted to rental', CANCELLED: 'Cancelled', DECLINED: 'Declined', NO_SHOW: 'No-show', EXPIRED: 'Expired' };
const colors: Record<Status, string> = { PENDING: 'gold', CONFIRMED: 'green', READY_FOR_PICKUP: 'blue', CONVERTED_TO_RENTAL: 'cyan', CANCELLED: 'default', DECLINED: 'volcano', NO_SHOW: 'volcano', EXPIRED: 'default' };
const defaultStart = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(0, 0, 0); return localDateTime(date); };
const defaultEnd = () => { const date = new Date(Date.now() + 25 * 60 * 60 * 1000); date.setMinutes(0, 0, 0); return localDateTime(date); };
function localDateTime(date: Date) { const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 16); }
function toIso(value: string) { return new Date(value).toISOString(); }
function failMessage(payload: unknown) { const detail = (payload as { error?: { message?: string | string[] } } | null)?.error?.message; return (Array.isArray(detail) ? detail[0] : detail) ?? 'We could not complete that action. Please try again.'; }

export function ReservationsWorkspace({ initialReservations, customers, locations, canManage, canConvertRental, canViewPayments, canRecordPayments, canManageDeposits }: { initialReservations: ReservationRow[]; customers: ReservationCustomer[]; locations: ReservationLocation[]; canManage: boolean; canConvertRental: boolean; canViewPayments: boolean; canRecordPayments: boolean; canManageDeposits: boolean }) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialReservations);
  const [statusFilter, setStatusFilter] = useState<Status | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState<ReservationRow>();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState<string>();
  const [checkedAvailability, setCheckedAvailability] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, contextHolder] = message.useMessage();
  const [form] = Form.useForm<Values>();
  const filtered = useMemo(() => reservations.filter((reservation) => !statusFilter || reservation.status === statusFilter), [reservations, statusFilter]);
  const openRequests = reservations.filter((reservation) => reservation.status === 'PENDING').length;

  function startCreate() {
    setActive(undefined); setError(''); setVehicles([]); setVehicleId(undefined); setCheckedAvailability(false); form.resetFields();
    form.setFieldsValue({ startAt: defaultStart(), endAt: defaultEnd() }); setDrawerOpen(true);
  }
  function showDetails(reservation: ReservationRow) { setActive(reservation); setError(''); setDrawerOpen(true); }

  async function checkAvailability() {
    try {
      const values = await form.validateFields(['pickupLocationId', 'startAt', 'endAt']);
      setChecking(true); setError(''); setVehicles([]); setVehicleId(undefined);
      const params = new URLSearchParams({ startAt: toIso(values.startAt), endAt: toIso(values.endAt), locationId: values.pickupLocationId });
      const response = await fetch(`/api/app/availability?${params}`);
      const result = await response.json() as { vehicles?: VehicleOption[]; error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(failMessage(result));
      setVehicles(result.vehicles ?? []); setCheckedAvailability(true);
      if (!result.vehicles?.length) setError('No ready vehicles are free for those dates at this location. Try another time or location.');
    } catch (cause) {
      if (cause instanceof Error) setError(cause.message);
    } finally { setChecking(false); }
  }

  async function createReservation(values: Values) {
    if (!vehicleId) { setError('Check availability and choose a vehicle first.'); return; }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/app/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...values, vehicleId, startAt: toIso(values.startAt), endAt: toIso(values.endAt) }) });
      const result = await response.json() as ReservationRow | { error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(failMessage(result));
      setReservations((current) => [...current, result as ReservationRow].sort((left, right) => left.startAt.localeCompare(right.startAt)));
      setDrawerOpen(false); await toast.success('Reservation request saved. The vehicle is now held for these dates.'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not save this reservation.'); }
    finally { setSaving(false); }
  }

  async function transition(reservation: ReservationRow, status: Status, reason?: string) {
    setError('');
    const response = await fetch(`/api/app/reservations/${encodeURIComponent(reservation.id)}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, reason }) });
    const result = await response.json().catch(() => null) as ReservationRow | { error?: { message?: string | string[] } } | null;
    if (!response.ok) { const messageText = failMessage(result); setError(messageText); await toast.error(messageText); return; }
    const updated = result as ReservationRow;
    setReservations((current) => current.map((item) => item.id === updated.id ? updated : item));
    setActive(updated); await toast.success(`Reservation ${labels[status].toLocaleLowerCase()}.`);
  }

  async function convertToRental(reservation: ReservationRow) {
    setError(''); setSaving(true);
    try {
      const response = await fetch(`/api/app/reservations/${encodeURIComponent(reservation.id)}/convert-to-rental`, { method: 'POST' });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(failMessage(result));
      await toast.success('Rental created. Continue to the handover checklist.'); router.push('/app/rentals' as Route); router.refresh();
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'We could not start this rental.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  const columns: ColumnsType<ReservationRow> = [
    { title: 'Customer', dataIndex: 'customerName', key: 'customerName', render: (name: string, row) => <button className={styles.textAction} type="button" onClick={() => showDetails(row)}>{name}</button> },
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => <span>{row.vehicle.make} {row.vehicle.model}<small className={styles.secondaryText}>{row.vehicle.registrationNumber}</small></span> },
    { title: 'Pickup', dataIndex: 'startAt', key: 'startAt', render: (date: string) => <DateTimeDisplay value={date} /> },
    { title: 'Return', dataIndex: 'endAt', key: 'endAt', render: (date: string) => <DateTimeDisplay value={date} /> },
    { title: 'Estimate', dataIndex: 'estimatedTotalMinor', key: 'estimate', render: (amount: number, row) => <MoneyDisplay amountMinor={amount} currency={row.currency} /> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: Status) => <Tag color={colors[status]}>{labels[status]}</Tag> },
    { title: 'Review', key: 'review', render: (_, row) => <Button type="link" onClick={() => showDetails(row)}>Open</Button> },
  ];

  const customerOptions = customers.filter((customer) => customer.status === 'ACTIVE').map((customer) => ({ value: customer.id, label: `${customer.fullName} · ${customer.phone}` }));
  const locationOptions = locations.map((location) => ({ value: location.id, label: location.name }));

  return <section className={styles.workspace}>
    {contextHolder}
    <PageHeader title="Reservations" description="Review booking requests, check dates and confirm only when customer details are ready." action={canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>Create reservation</Button> : undefined} />
    <div className={styles.summary} aria-label="Reservation summary"><Card><span>Open requests</span><strong>{openRequests}</strong></Card><Card><span>All reservations</span><strong>{reservations.length}</strong></Card><Card><span>Next pickup</span><strong>{reservations.filter((item) => !['CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED'].includes(item.status)).length ? <DateTimeDisplay value={reservations.find((item) => !['CANCELLED', 'DECLINED', 'NO_SHOW', 'EXPIRED'].includes(item.status))!.startAt} /> : 'None scheduled'}</strong></Card></div>
    <Card className={styles.listCard}>
      <div className={styles.listHeader}><div><h2>Booking requests</h2><p>Each pending request holds the selected vehicle dates until staff confirms or closes it.</p></div><Select aria-label="Filter reservations by status" allowClear placeholder="All statuses" value={statusFilter} onChange={setStatusFilter} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} className={styles.statusFilter} /></div>
      {filtered.length ? <Table rowKey="id" columns={columns} dataSource={filtered} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 960 }} /> : <Empty description={statusFilter ? 'No reservations in this status.' : 'No reservations yet. Create the first request when a renter is ready.'}>{canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>Create reservation</Button> : null}</Empty>}
    </Card>

    <Drawer title={active ? `Reservation · ${active.customerName}` : 'Create reservation'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={560} destroyOnClose>
      {active ? <>
        {error ? <Alert className={styles.error} type="error" showIcon message={error} /> : null}
        <div className={styles.detailStatus}><Tag color={colors[active.status]}>{labels[active.status]}</Tag><span>Created {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'Asia/Karachi' }).format(new Date(active.createdAt))}</span></div>
        <Descriptions bordered size="small" column={1} items={[{ key: 'customer', label: 'Customer', children: `${active.customerName} · ${active.customerPhone}` }, { key: 'verification', label: 'Identity check', children: active.customer.verification === 'VERIFIED' ? 'Verified' : 'Not yet verified' }, { key: 'vehicle', label: 'Vehicle', children: `${active.vehicle.make} ${active.vehicle.model} · ${active.vehicle.registrationNumber}` }, { key: 'pickup', label: 'Pickup', children: <><DateTimeDisplay value={active.startAt} /> · {active.pickupLocation.name}</> }, { key: 'return', label: 'Return', children: <><DateTimeDisplay value={active.endAt} /> · {active.dropoffLocation?.name ?? active.pickupLocation.name}</> }, { key: 'estimate', label: 'Estimated rental', children: <MoneyDisplay amountMinor={active.estimatedTotalMinor} currency={active.currency} /> }, { key: 'deposit', label: 'Security deposit', children: <MoneyDisplay amountMinor={active.depositMinor} currency={active.currency} /> }, { key: 'notes', label: 'Staff notes', children: active.notes || 'None' }, ...(active.statusReason ? [{ key: 'reason', label: 'Status reason', children: active.statusReason }] : [])]} />
        {canViewPayments ? <ReservationFinancePanel reservationId={active.id} canRecordPayments={canRecordPayments} canManageDeposits={canManageDeposits} /> : null}
        {canManage && active.status === 'PENDING' ? <div className={styles.reviewActions}><Alert type="info" showIcon message="Confirm only after checking the customer’s identity and driving eligibility." /><Button type="primary" onClick={() => void transition(active, 'CONFIRMED')}>Confirm reservation</Button><Popconfirm title="Decline this request?" description="Add a reason so your team can understand the decision." okText="Decline request" cancelText="Keep request" onConfirm={() => void transition(active, 'DECLINED', 'Vehicle or booking request declined by staff.')}><Button danger>Decline</Button></Popconfirm></div> : null}
        {canManage && active.status === 'CONFIRMED' ? <div className={styles.reviewActions}><Button type="primary" onClick={() => void transition(active, 'READY_FOR_PICKUP')}>Mark ready for pickup</Button></div> : null}
        {canConvertRental && active.status === 'READY_FOR_PICKUP' ? <div className={styles.reviewActions}><Alert type="info" showIcon message="The renter must be verified. RentPay will create the rental record before you begin vehicle handover." /><Popconfirm title="Start this rental?" description="This keeps the reservation history and creates its linked rental record." okText="Start rental" cancelText="Not yet" onConfirm={() => void convertToRental(active)}><Button type="primary" loading={saving}>Start rental handover</Button></Popconfirm></div> : null}
        {canManage && ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'].includes(active.status) ? <Popconfirm title="Mark this booking as a no-show?" description="This closes the request and releases the vehicle dates." okText="Confirm no-show" cancelText="Go back" onConfirm={() => void transition(active, 'NO_SHOW', 'Customer did not arrive for the scheduled pickup.')}><Button type="text" className={styles.cancelAction}>Mark as no-show</Button></Popconfirm> : null}
        {canManage && ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP'].includes(active.status) ? <Popconfirm title="Cancel this reservation?" description="This will release the vehicle dates. A reason will be recorded." okText="Cancel reservation" cancelText="Keep reservation" onConfirm={() => void transition(active, 'CANCELLED', 'Cancelled by staff request.')}><Button danger type="text" className={styles.cancelAction}>Cancel reservation</Button></Popconfirm> : null}
      </> : <Form form={form} layout="vertical" onFinish={createReservation} requiredMark="optional">
        <p className={styles.formIntro}>Choose a renter and dates first. RentPay checks the live schedule before you select a vehicle.</p>
        {error ? <Alert className={styles.error} type="error" showIcon message={error} /> : null}
        <Form.Item label="Customer" name="customerId" rules={[{ required: true, message: 'Choose the renter for this booking.' }]}><Select showSearch optionFilterProp="label" placeholder="Search customer name or phone" options={customerOptions} notFoundContent="Add the customer first in Customers & drivers." /></Form.Item>
        <Form.Item label="Pickup location" name="pickupLocationId" rules={[{ required: true, message: 'Choose where the renter will collect the vehicle.' }]}><Select placeholder="Choose a location" options={locationOptions} /></Form.Item>
        <Form.Item label="Pickup date and time" name="startAt" rules={[{ required: true, message: 'Choose a pickup date and time.' }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item label="Return date and time" name="endAt" rules={[{ required: true, message: 'Choose the expected return date and time.' }, { validator: async (_, value: string) => { const start = form.getFieldValue('startAt'); if (!start || !value || new Date(value) > new Date(start)) return; throw new Error('Return must be after pickup.'); } }]}><Input type="datetime-local" /></Form.Item>
        <Form.Item label="Return location" name="dropoffLocationId" extra="Optional. Leave blank to return to the pickup location."><Select allowClear placeholder="Same as pickup" options={locationOptions} /></Form.Item>
        <Button icon={<CalendarOutlined />} onClick={() => void checkAvailability()} loading={checking} className={styles.availabilityButton}>Check available vehicles</Button>
        {checkedAvailability && vehicles.length ? <Form.Item label="Available vehicle" required>
          <Select value={vehicleId} onChange={setVehicleId} placeholder="Select a vehicle" options={vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.make} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''} · ${vehicle.registrationNumber} · ${new Intl.NumberFormat(undefined, { style: 'currency', currency: vehicle.currency }).format(vehicle.dailyRateMinor / 100)} / day` }))} />
          {vehicleId ? <p className={styles.selectedVehicle}>{vehicles.find((vehicle) => vehicle.id === vehicleId)?.seats ? `${vehicles.find((vehicle) => vehicle.id === vehicleId)?.seats} seats` : 'Vehicle selected'} · availability will be checked again when you save.</p> : null}
        </Form.Item> : null}
        <Form.Item label="Staff notes" name="notes" extra="Private to your team; not shown to the renter."><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        <div className={styles.formActions}><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving} disabled={!checkedAvailability || !vehicleId}>Save booking request</Button></div>
      </Form>}
    </Drawer>
  </section>;
}
