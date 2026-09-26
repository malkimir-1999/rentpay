'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, InputNumber, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DateTimeDisplay, MoneyDisplay, PageHeader } from '../../../components/ui';
import styles from './rentals.module.css';
import { inspectionAreas, type VehicleConditionChecklist } from '../../../../../packages/config/src/inspection';

type Status = 'BOOKED' | 'ACTIVE' | 'RETURNED' | 'CLOSED' | 'CANCELLED';
export type RentalLocation = { id: string; name: string };
export type RentalRow = {
  id: string; status: Status; startAt: string; expectedReturnAt: string; actualReturnAt: string | null;
  dailyRateMinor: number; estimatedTotalMinor: number; depositMinor: number; currency: string;
  customerName: string; customerPhone: string; customerEmail: string | null;
  startOdometerKm: number | null; endOdometerKm: number | null;
  startFuelPercent: number | null; endFuelPercent: number | null;
  checkedOutAt: string | null; checkedInAt: string | null; notes: string | null;
  checkoutNotes: string | null; returnNotes: string | null;
  reservation: { id: string; status: string }; customer: { id: string; verification: string };
  vehicle: { id: string; make: string; model: string; registrationNumber: string; odometerKm: number; condition: string };
  pickupLocation: RentalLocation; dropoffLocation: RentalLocation | null; actualReturnLocation: RentalLocation | null;
  settlement: { id: string; rentalAmountMinor: number; additionalChargesMinor: number; paymentReceivedMinor: number; depositRetainedMinor: number; depositRefundedMinor: number; currency: string; note: string | null; settledAt: string } | null;
};
type CheckoutValues = { odometerKm: number; fuelPercent: number; notes?: string; checklist: VehicleConditionChecklist };
type ReturnValues = { odometerKm: number; fuelPercent: number; returnLocationId: string; notes?: string; checklist: VehicleConditionChecklist };
type ExtensionValues = { expectedReturnAt: string; reason: string };
type SettlementValues = { additionalCharges: number; paymentReceived: number; method: string; reference?: string; note?: string };
const statusLabel: Record<Status, string> = { BOOKED: 'Ready for handover', ACTIVE: 'On rent', RETURNED: 'Returned · preparation', CLOSED: 'Settled', CANCELLED: 'Cancelled' };
const statusColor: Record<Status, string> = { BOOKED: 'blue', ACTIVE: 'green', RETURNED: 'gold', CLOSED: 'default', CANCELLED: 'default' };
function toIso(value: string) { return new Date(value).toISOString(); }
function localDateTime(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function failure(payload: unknown) { const detail = (payload as { error?: { message?: string | string[] } } | null)?.error?.message; return (Array.isArray(detail) ? detail[0] : detail) ?? 'We could not complete that action. Please try again.'; }

export function RentalsWorkspace({ initialRentals, locations, canCheckout, canReturn, canExtend, canInspect, canSettle }: { initialRentals: RentalRow[]; locations: RentalLocation[]; canCheckout: boolean; canReturn: boolean; canExtend: boolean; canInspect: boolean; canSettle: boolean }) {
  const router = useRouter();
  const [rentals, setRentals] = useState(initialRentals);
  const [active, setActive] = useState<RentalRow>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, contextHolder] = message.useMessage();
  const [checkoutForm] = Form.useForm<CheckoutValues>();
  const [returnForm] = Form.useForm<ReturnValues>();
  const [extensionForm] = Form.useForm<ExtensionValues>();
  const [settlementForm] = Form.useForm<SettlementValues>();
  const counts = useMemo(() => ({ booked: rentals.filter((rental) => rental.status === 'BOOKED').length, active: rentals.filter((rental) => rental.status === 'ACTIVE').length, overdue: rentals.filter((rental) => rental.status === 'ACTIVE' && new Date(rental.expectedReturnAt) < new Date()).length }), [rentals]);

  function open(rental: RentalRow) {
    setActive(rental); setError(''); checkoutForm.resetFields(); returnForm.resetFields(); extensionForm.resetFields(); settlementForm.resetFields();
    checkoutForm.setFieldsValue({ odometerKm: rental.vehicle.odometerKm, fuelPercent: 100 });
    returnForm.setFieldsValue({ odometerKm: rental.startOdometerKm ?? rental.vehicle.odometerKm, fuelPercent: rental.startFuelPercent ?? 100, returnLocationId: rental.dropoffLocation?.id ?? rental.pickupLocation.id });
    const later = new Date(new Date(rental.expectedReturnAt).getTime() + 86400000);
    extensionForm.setFieldsValue({ expectedReturnAt: localDateTime(later), reason: 'Renter requested more time' });
    settlementForm.setFieldsValue({ additionalCharges: 0, paymentReceived: 0, method: 'CASH' });
  }

  async function mutate(action: 'checkout' | 'return' | 'extension' | 'settlement', values: CheckoutValues | ReturnValues | ExtensionValues | SettlementValues) {
    if (!active) return;
    setSaving(true); setError('');
    try {
      if (canInspect && (action === 'checkout' || action === 'return')) {
        const inspectionValues = values as CheckoutValues | ReturnValues;
        const inspection = await fetch('/api/app/inspections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vehicleId: active.vehicle.id, rentalId: active.id, stage: action === 'checkout' ? 'PRE_HANDOVER' : 'RETURN', checklist: inspectionValues.checklist, odometerKm: inspectionValues.odometerKm, fuelPercent: inspectionValues.fuelPercent, notes: inspectionValues.notes }) });
        const inspectionResult = await inspection.json() as { error?: { message?: string | string[] } };
        if (!inspection.ok) throw new Error(failure(inspectionResult));
      }
      const settlementValues = values as SettlementValues;
      const payload = action === 'extension' ? { ...(values as ExtensionValues), expectedReturnAt: toIso((values as ExtensionValues).expectedReturnAt) } : action === 'settlement' ? { ...settlementValues, additionalChargesMinor: Math.round(settlementValues.additionalCharges * 100), paymentReceivedMinor: Math.round(settlementValues.paymentReceived * 100) } : values;
      const response = await fetch(`/api/app/rentals/${encodeURIComponent(active.id)}/${action}`, { method: action === 'extension' ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as RentalRow | { error?: { message?: string | string[] } };
      if (!response.ok) throw new Error(failure(result));
      if (action === 'settlement') { setRentals((current) => current.map((rental) => rental.id === active.id ? { ...rental, status: 'CLOSED' } : rental)); setActive({ ...active, status: 'CLOSED' }); await toast.success('Rental settled and closed.'); router.refresh(); return; }
      const updated = result as RentalRow;
      setRentals((current) => current.map((rental) => rental.id === updated.id ? updated : rental)); setActive(updated);
      await toast.success(action === 'checkout' ? 'Vehicle handover recorded.' : action === 'return' ? 'Vehicle returned and moved to preparation.' : 'Rental end time updated.');
      router.refresh();
    } catch (cause) { const text = cause instanceof Error ? cause.message : 'We could not save this update.'; setError(text); await toast.error(text); }
    finally { setSaving(false); }
  }

  const columns: ColumnsType<RentalRow> = [
    { title: 'Renter', dataIndex: 'customerName', key: 'customerName', render: (name: string, row) => <button className={styles.textAction} type="button" onClick={() => open(row)}>{name}</button> },
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => <span>{row.vehicle.make} {row.vehicle.model}<small>{row.vehicle.registrationNumber}</small></span> },
    { title: 'Pickup', dataIndex: 'startAt', key: 'startAt', render: (value: string) => <DateTimeDisplay value={value} /> },
    { title: 'Return due', dataIndex: 'expectedReturnAt', key: 'expectedReturnAt', render: (value: string) => <DateTimeDisplay value={value} /> },
    { title: 'Estimate', dataIndex: 'estimatedTotalMinor', key: 'estimate', render: (amount: number, row) => <MoneyDisplay amountMinor={amount} currency={row.currency} /> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: Status) => <Tag color={statusColor[status]}>{statusLabel[status]}</Tag> },
    { title: 'Next step', key: 'action', render: (_, row) => <Button type="link" onClick={() => open(row)}>{row.status === 'BOOKED' ? 'Start handover' : row.status === 'ACTIVE' ? 'Open rental' : 'View details'}</Button> },
  ];

  return <section className={styles.workspace}>
    {contextHolder}
    <PageHeader title="Rentals" description="Keep handovers, active rentals, extensions and vehicle returns in one clear workflow." />
    <div className={styles.summary}><Card><span>Ready for handover</span><strong>{counts.booked}</strong></Card><Card><span>Currently on rent</span><strong>{counts.active}</strong></Card><Card><span>Past return time</span><strong>{counts.overdue}</strong></Card></div>
    <Card className={styles.listCard}>
      <div className={styles.listHeading}><div><h2>Rental schedule</h2><p>Each rental keeps a dated customer and vehicle record. Returned vehicles move to preparation before becoming available again.</p></div></div>
      {rentals.length ? <Table rowKey="id" columns={columns} dataSource={rentals} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 980 }} /> : <Empty description="No rentals yet. A confirmed booking appears here when it is marked ready and converted." />}
    </Card>
    <Drawer title={active ? `Rental · ${active.customerName}` : 'Rental details'} open={Boolean(active)} onClose={() => setActive(undefined)} width={560} destroyOnClose>
      {active ? <div className={styles.detail}>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <div className={styles.detailStatus}><Tag color={statusColor[active.status]}>{statusLabel[active.status]}</Tag><span>{active.vehicle.make} {active.vehicle.model} · {active.vehicle.registrationNumber}</span></div>
        <Descriptions bordered size="small" column={1} items={[{ key: 'customer', label: 'Renter', children: `${active.customerName} · ${active.customerPhone}` }, { key: 'verification', label: 'Identity', children: active.customer.verification === 'VERIFIED' ? 'Verified' : 'Not verified' }, { key: 'pickup', label: 'Pickup', children: <><DateTimeDisplay value={active.startAt} /> · {active.pickupLocation.name}</> }, { key: 'return', label: 'Return due', children: <><DateTimeDisplay value={active.expectedReturnAt} /> · {active.dropoffLocation?.name ?? active.pickupLocation.name}</> }, { key: 'estimate', label: 'Estimated rental', children: <MoneyDisplay amountMinor={active.estimatedTotalMinor} currency={active.currency} /> }, { key: 'deposit', label: 'Security deposit', children: <MoneyDisplay amountMinor={active.depositMinor} currency={active.currency} /> }, ...(active.startOdometerKm === null ? [] : [{ key: 'startOdometer', label: 'Handover mileage', children: `${active.startOdometerKm.toLocaleString()} km · ${active.startFuelPercent}% fuel` }]), ...(active.endOdometerKm === null ? [] : [{ key: 'endOdometer', label: 'Return mileage', children: `${active.endOdometerKm.toLocaleString()} km · ${active.endFuelPercent}% fuel` }]), ...(active.actualReturnAt ? [{ key: 'actualReturn', label: 'Returned at', children: <><DateTimeDisplay value={active.actualReturnAt} /> · {active.actualReturnLocation?.name}</> }] : [])]} />
        {active.checkoutNotes ? <div className={styles.note}><strong>Handover note</strong><p>{active.checkoutNotes}</p></div> : null}
        {active.returnNotes ? <div className={styles.note}><strong>Return note</strong><p>{active.returnNotes}</p></div> : null}
        {active.settlement ? <Card size="small" title="Final settlement record" className={styles.actionCard}>
          <Descriptions size="small" column={1} items={[{ key: 'rental', label: 'Rental total', children: <MoneyDisplay amountMinor={active.settlement.rentalAmountMinor} currency={active.settlement.currency} /> }, { key: 'additional', label: 'Additional charges', children: <MoneyDisplay amountMinor={active.settlement.additionalChargesMinor} currency={active.settlement.currency} /> }, { key: 'payment', label: 'Payment received at close', children: <MoneyDisplay amountMinor={active.settlement.paymentReceivedMinor} currency={active.settlement.currency} /> }, { key: 'retained', label: 'Deposit applied', children: <MoneyDisplay amountMinor={active.settlement.depositRetainedMinor} currency={active.settlement.currency} /> }, { key: 'refunded', label: 'Deposit refunded', children: <MoneyDisplay amountMinor={active.settlement.depositRefundedMinor} currency={active.settlement.currency} /> }, { key: 'time', label: 'Settled at', children: <DateTimeDisplay value={active.settlement.settledAt} /> }]} />
          {active.settlement.note ? <div className={styles.note}><strong>Settlement note</strong><p>{active.settlement.note}</p></div> : null}
        </Card> : null}
        {active.status === 'BOOKED' && canCheckout ? <Card size="small" title="Vehicle handover" className={styles.actionCard}>
          <Alert type="info" showIcon message="Confirm renter identity, complete each condition check and collect the required security deposit before handing over the keys." />
          {!canInspect ? <Alert type="warning" showIcon message="A teammate with inspection access must complete the pre-handover vehicle check first." /> : null}
          <Form form={checkoutForm} layout="vertical" onFinish={(values) => void mutate('checkout', values)}>
            <div className={styles.formGrid}>
              <Form.Item label="Handover mileage (km)" name="odometerKm" rules={[{ required: true }, { type: 'number', min: active.vehicle.odometerKm }]}><InputNumber min={active.vehicle.odometerKm} precision={0} className={styles.numberInput} /></Form.Item>
              <Form.Item label="Fuel at handover (%)" name="fuelPercent" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}><InputNumber min={0} max={100} precision={0} className={styles.numberInput} /></Form.Item>
            </div>
            {canInspect ? <Form.Item label="Pre-handover vehicle condition" required><div className={styles.formGrid}>{inspectionAreas.map((area) => <Form.Item key={area.key} label={area.label} name={['checklist', area.key]} rules={[{ required: true, message: 'Choose a condition for this area.' }]}><Select options={[{ value: 'OK', label: 'Looks good' }, { value: 'ISSUE', label: 'Issue found' }]} /></Form.Item>)}</div></Form.Item> : null}
            <Form.Item label="Handover note (optional)" name="notes"><Input maxLength={2000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Complete handover</Button>
          </Form>
        </Card> : null}
        {active.status === 'ACTIVE' && canExtend ? <Card size="small" title="Extend rental" className={styles.actionCard}><Form form={extensionForm} layout="vertical" onFinish={(values) => void mutate('extension', values)}><Form.Item label="New expected return" name="expectedReturnAt" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item><Form.Item label="Reason" name="reason" rules={[{ required: true, min: 3 }]}><Input maxLength={500} /></Form.Item><Button htmlType="submit" loading={saving}>Check availability and extend</Button></Form></Card> : null}
        {active.status === 'ACTIVE' && canReturn ? <Card size="small" title="Vehicle return" className={styles.actionCard}>
          <Alert type="info" showIcon message="Record the return condition before completing check-in. Any issue will open a damage case and keep the vehicle out of service." />
          {!canInspect ? <Alert type="warning" showIcon message="A teammate with inspection access must complete the return condition check first." /> : null}
          <Form form={returnForm} layout="vertical" onFinish={(values) => void mutate('return', values)}>
            <div className={styles.formGrid}>
              <Form.Item label="Return mileage (km)" name="odometerKm" rules={[{ required: true }, { type: 'number', min: active.startOdometerKm ?? 0 }]}><InputNumber min={active.startOdometerKm ?? 0} precision={0} className={styles.numberInput} /></Form.Item>
              <Form.Item label="Fuel at return (%)" name="fuelPercent" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}><InputNumber min={0} max={100} precision={0} className={styles.numberInput} /></Form.Item>
            </div>
            {canInspect ? <Form.Item label="Return vehicle condition" required><div className={styles.formGrid}>{inspectionAreas.map((area) => <Form.Item key={area.key} label={area.label} name={['checklist', area.key]} rules={[{ required: true, message: 'Choose a condition for this area.' }]}><Select options={[{ value: 'OK', label: 'Looks good' }, { value: 'ISSUE', label: 'Issue found' }]} /></Form.Item>)}</div></Form.Item> : null}
            <Form.Item label="Return location" name="returnLocationId" rules={[{ required: true }]}><Select options={locations.map((location) => ({ value: location.id, label: location.name }))} /></Form.Item>
            <Form.Item label="Return note (optional)" name="notes"><Input maxLength={2000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Record vehicle return</Button>
          </Form>
        </Card> : null}
        {active.status === 'RETURNED' ? <>
          <Alert type="warning" showIcon message="The vehicle stays in preparation. Resolve damage cases, collect any remaining balance, then return or apply the deposit to close the rental." />
          {canSettle ? <Card size="small" title="Final settlement" className={styles.actionCard}>
            <p>Rental balance starts at <MoneyDisplay amountMinor={active.estimatedTotalMinor} currency={active.currency} />. The held deposit is applied to any remaining amount; the rest is recorded as refunded.</p>
            <Form form={settlementForm} layout="vertical" onFinish={(values) => void mutate('settlement', values)}>
              <div className={styles.formGrid}>
                <Form.Item label={`Additional charges (${active.currency})`} name="additionalCharges" rules={[{ required: true }, { type: 'number', min: 0, max: 20000000 }]}><InputNumber min={0} precision={2} className={styles.numberInput} /></Form.Item>
                <Form.Item label={`Collect now (${active.currency})`} name="paymentReceived" rules={[{ required: true }, { type: 'number', min: 0, max: 20000000 }]}><InputNumber min={0} precision={2} className={styles.numberInput} /></Form.Item>
                <Form.Item label="Payment method" name="method" rules={[{ required: true }]}><Select options={['CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'ONLINE_GATEWAY', 'OTHER'].map((value) => ({ value, label: value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) }))} /></Form.Item>
                <Form.Item label="Reference (optional)" name="reference"><Input maxLength={160} /></Form.Item>
              </div>
              <Form.Item label="Settlement note or charge reason" name="note"><Input maxLength={1000} /></Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>Settle and close rental</Button>
            </Form>
          </Card> : <Alert type="info" showIcon message="Payment and deposit permissions are required to settle this rental." />}
        </> : null}
      </div> : null}
    </Drawer>
  </section>;
}
