'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Collapse, Drawer, Empty, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CarOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { MoneyDisplay, PageHeader } from '../../../components/ui';
import styles from './fleet.module.css';

type Condition = 'READY' | 'PREPARATION' | 'MAINTENANCE' | 'DAMAGED' | 'OUT_OF_SERVICE';
export type FleetVehicle = {
  id: string; make: string; model: string; variant: string | null; year: number | null;
  registrationNumber: string; vin: string | null; color: string | null; category: string | null;
  transmission: string | null; fuelType: string | null; seats: number | null; odometerKm: number;
  condition: Condition; notes: string | null; dailyRateMinor: number; weeklyRateMinor: number | null;
  monthlyRateMinor: number | null; depositMinor: number; currency: string; locationId: string | null;
  location?: { id: string; name: string } | null;
};
type Location = { id: string; name: string };
type VehicleForm = Omit<FleetVehicle, 'id' | 'dailyRateMinor' | 'weeklyRateMinor' | 'monthlyRateMinor' | 'depositMinor' | 'currency' | 'location' | 'archivedAt' | 'createdAt' | 'updatedAt'> & {
  dailyRate: number; weeklyRate?: number; monthlyRate?: number; deposit?: number;
};

const conditionLabels: Record<Condition, string> = { READY: 'Ready for use', PREPARATION: 'Needs preparation', MAINTENANCE: 'In maintenance', DAMAGED: 'Damage reported', OUT_OF_SERVICE: 'Out of service' };
const conditionColors: Record<Condition, string> = { READY: 'green', PREPARATION: 'gold', MAINTENANCE: 'blue', DAMAGED: 'volcano', OUT_OF_SERVICE: 'default' };
const toFormValues = (vehicle?: FleetVehicle): Partial<VehicleForm> => vehicle ? {
  ...vehicle,
  dailyRate: vehicle.dailyRateMinor / 100,
  weeklyRate: vehicle.weeklyRateMinor == null ? undefined : vehicle.weeklyRateMinor / 100,
  monthlyRate: vehicle.monthlyRateMinor == null ? undefined : vehicle.monthlyRateMinor / 100,
  deposit: vehicle.depositMinor / 100,
} : { condition: 'READY', odometerKm: 0 };

export function FleetWorkspace({ initialVehicles, locations, currency, canManage }: { initialVehicles: FleetVehicle[]; locations: Location[]; currency: string; canManage: boolean }) {
  const router = useRouter();
  const [form] = Form.useForm<VehicleForm>();
  const [toast, contextHolder] = message.useMessage();
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState<Condition | undefined>();
  const [active, setActive] = useState<FleetVehicle | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleVehicles = useMemo(() => initialVehicles.filter((vehicle) => {
    const searchable = `${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ''} ${vehicle.registrationNumber}`.toLocaleLowerCase();
    return searchable.includes(search.trim().toLocaleLowerCase()) && (!conditionFilter || vehicle.condition === conditionFilter);
  }), [initialVehicles, search, conditionFilter]);

  function openCreate() { setActive(undefined); setError(''); form.resetFields(); form.setFieldsValue(toFormValues()); setDrawerOpen(true); }
  function openEdit(vehicle: FleetVehicle) { setActive(vehicle); setError(''); form.resetFields(); form.setFieldsValue(toFormValues(vehicle)); setDrawerOpen(true); }

  async function save(values: VehicleForm) {
    setSaving(true); setError('');
    const { dailyRate, weeklyRate, monthlyRate, deposit, ...vehicle } = values;
    const payload = {
      ...vehicle,
      dailyRateMinor: Math.round(Number(dailyRate) * 100),
      ...(weeklyRate == null ? { weeklyRateMinor: null } : { weeklyRateMinor: Math.round(Number(weeklyRate) * 100) }),
      ...(monthlyRate == null ? { monthlyRateMinor: null } : { monthlyRateMinor: Math.round(Number(monthlyRate) * 100) }),
      depositMinor: Math.round(Number(deposit ?? 0) * 100),
    };
    try {
      const response = await fetch(active ? `/api/app/fleet/${encodeURIComponent(active.id)}` : '/api/app/fleet', {
        method: active ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: { message?: string | string[] } } | null;
        const detail = result?.error?.message;
        throw new Error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not save this vehicle. Please try again.');
      }
      await toast.success(active ? 'Vehicle details saved.' : 'Vehicle added to your fleet.');
      setDrawerOpen(false); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save this vehicle. Please try again.');
    } finally { setSaving(false); }
  }

  async function archive(vehicle: FleetVehicle) {
    try {
      const response = await fetch(`/api/app/fleet/${encodeURIComponent(vehicle.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('We could not archive this vehicle. Try again.');
      await toast.success(`${vehicle.make} ${vehicle.model} was archived.`); router.refresh();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'We could not archive this vehicle.'); }
  }

  const columns: ColumnsType<FleetVehicle> = [
    { title: 'Vehicle', key: 'vehicle', render: (_, vehicle) => <div className={styles.vehicleName}><span className={styles.vehicleIcon}><CarOutlined aria-hidden="true" /></span><span><strong>{vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}</strong><small>{[vehicle.variant, vehicle.category].filter(Boolean).join(' · ') || 'Rental vehicle'}</small></span></div> },
    { title: 'Registration', dataIndex: 'registrationNumber', key: 'registrationNumber' },
    { title: 'Location', key: 'location', render: (_, vehicle) => vehicle.location?.name ?? 'Not assigned' },
    { title: 'Daily rate', key: 'rate', render: (_, vehicle) => <MoneyDisplay amountMinor={vehicle.dailyRateMinor} currency={vehicle.currency} /> },
    { title: 'Condition', key: 'condition', render: (_, vehicle) => <Tag color={conditionColors[vehicle.condition]}>{conditionLabels[vehicle.condition]}</Tag> },
    ...(canManage ? [{ title: 'Actions', key: 'actions', render: (_: unknown, vehicle: FleetVehicle) => <Space wrap><Button type="text" icon={<EditOutlined />} aria-label={`Edit ${vehicle.make} ${vehicle.model}`} onClick={() => openEdit(vehicle)}>Edit</Button><Popconfirm title="Archive this vehicle?" description="It will be hidden from the active fleet, while its history remains in RentPay." okText="Archive vehicle" cancelText="Keep vehicle" onConfirm={() => archive(vehicle)}><Button type="text" danger aria-label={`Archive ${vehicle.make} ${vehicle.model}`}>Archive</Button></Popconfirm></Space> } satisfies ColumnsType<FleetVehicle>[number]] : []),
  ];

  return <>
    {contextHolder}
    <PageHeader title="Fleet" description="Keep your vehicle details, rates and condition in one place." action={canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add vehicle</Button> : undefined} />
    <section className={styles.summary} aria-label="Fleet overview"><Card><span>Active vehicles</span><strong>{initialVehicles.length}</strong></Card><Card><span>Ready for use</span><strong>{initialVehicles.filter((vehicle) => vehicle.condition === 'READY').length}</strong></Card><Card><span>Needs attention</span><strong>{initialVehicles.filter((vehicle) => vehicle.condition !== 'READY').length}</strong></Card></section>
    <section className={styles.listPanel} aria-labelledby="fleet-list-heading">
      <div className={styles.listHeader}><div><h2 id="fleet-list-heading">Your vehicles</h2><p>{visibleVehicles.length} {visibleVehicles.length === 1 ? 'vehicle' : 'vehicles'} in this view</p></div></div>
      <div className={styles.filters}><Input.Search aria-label="Search your fleet" placeholder="Search make, model or registration" allowClear value={search} onChange={(event) => setSearch(event.target.value)} /><Select aria-label="Filter by condition" allowClear placeholder="All conditions" value={conditionFilter} onChange={setConditionFilter} options={Object.entries(conditionLabels).map(([value, label]) => ({ value, label }))} /></div>
      {visibleVehicles.length ? <>
        <div className={styles.desktopTable}><Table<FleetVehicle> columns={columns} dataSource={visibleVehicles} rowKey="id" pagination={{ pageSize: 10, responsive: true }} scroll={{ x: 720 }} /></div>
        <div className={styles.mobileList}>{visibleVehicles.map((vehicle) => <article className={styles.vehicleCard} key={vehicle.id}><div className={styles.vehicleCardHeading}><div className={styles.vehicleName}><span className={styles.vehicleIcon}><CarOutlined aria-hidden="true" /></span><span><strong>{vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}</strong><small>{vehicle.variant ?? vehicle.category ?? 'Rental vehicle'}</small></span></div><Tag color={conditionColors[vehicle.condition]}>{conditionLabels[vehicle.condition]}</Tag></div><dl><div><dt>Registration</dt><dd>{vehicle.registrationNumber}</dd></div><div><dt>Location</dt><dd>{vehicle.location?.name ?? 'Not assigned'}</dd></div><div><dt>Daily rate</dt><dd><MoneyDisplay amountMinor={vehicle.dailyRateMinor} currency={vehicle.currency} /></dd></div></dl>{canManage && <div className={styles.cardActions}><Button icon={<EditOutlined />} onClick={() => openEdit(vehicle)}>Edit</Button><Popconfirm title="Archive this vehicle?" description="Its history will remain available." okText="Archive vehicle" cancelText="Keep vehicle" onConfirm={() => archive(vehicle)}><Button danger>Archive</Button></Popconfirm></div>}</article>)}</div>
      </> : <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>{initialVehicles.length ? 'No vehicles match these filters.' : 'Your fleet is ready for its first vehicle.'}</span>}>{!initialVehicles.length && canManage && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add your first vehicle</Button>}</Empty>}
    </section>
    <Drawer title={active ? 'Update vehicle' : 'Add a vehicle'} open={drawerOpen} onClose={() => setDrawerOpen(false)} size="large" destroyOnHidden>
      {error && <Alert className={styles.formError} type="error" showIcon title={error} role="alert" />}
      <Form form={form} layout="vertical" onFinish={save} requiredMark="optional">
        <div className={styles.formGrid}>
          <Form.Item label="Make" name="make" rules={[{ required: true, whitespace: true, message: 'Enter the vehicle make.' }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item label="Model" name="model" rules={[{ required: true, whitespace: true, message: 'Enter the vehicle model.' }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item label="Registration number" name="registrationNumber" rules={[{ required: true, whitespace: true, message: 'Enter the registration number.' }]}><Input autoComplete="off" /></Form.Item>
          <Form.Item label={`Daily rate (${currency})`} name="dailyRate" rules={[{ required: true, type: 'number', min: 0, message: 'Enter a valid daily rate.' }]}><InputNumber min={0} precision={2} className={styles.fullWidth} /></Form.Item>
          <Form.Item label="Pickup location" name="locationId"><Select allowClear placeholder="Choose a location" options={locations.map((location) => ({ value: location.id, label: location.name }))} /></Form.Item>
          <Form.Item label="Condition" name="condition"><Select options={Object.entries(conditionLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        </div>
        <Collapse className={styles.optionalFields} items={[{ key: 'details', label: 'More vehicle details', children: <div className={styles.formGrid}>
          <Form.Item label="Variant" name="variant"><Input /></Form.Item><Form.Item label="Year" name="year"><InputNumber min={1950} max={new Date().getUTCFullYear() + 2} precision={0} className={styles.fullWidth} /></Form.Item>
          <Form.Item label="VIN / chassis number" name="vin"><Input /></Form.Item><Form.Item label="Color" name="color"><Input /></Form.Item>
          <Form.Item label="Category" name="category"><Input placeholder="e.g. Sedan, SUV" /></Form.Item>
          <Form.Item label="Transmission" name="transmission"><Select allowClear options={['MANUAL', 'AUTOMATIC', 'CVT', 'OTHER'].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }))} /></Form.Item>
          <Form.Item label="Fuel type" name="fuelType"><Select allowClear options={['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'CNG', 'LPG', 'OTHER'].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }))} /></Form.Item>
          <Form.Item label="Seats" name="seats"><InputNumber min={1} max={100} precision={0} className={styles.fullWidth} /></Form.Item>
          <Form.Item label="Odometer (km)" name="odometerKm"><InputNumber min={0} precision={0} className={styles.fullWidth} /></Form.Item>
          <Form.Item label={`Weekly rate (${currency})`} name="weeklyRate"><InputNumber min={0} precision={2} className={styles.fullWidth} /></Form.Item>
          <Form.Item label={`Monthly rate (${currency})`} name="monthlyRate"><InputNumber min={0} precision={2} className={styles.fullWidth} /></Form.Item>
          <Form.Item label={`Security deposit (${currency})`} name="deposit"><InputNumber min={0} precision={2} className={styles.fullWidth} /></Form.Item>
          <Form.Item className={styles.fullField} label="Notes" name="notes"><Input.TextArea rows={3} maxLength={2000} showCount /></Form.Item>
        </div> }]}/>
        <div className={styles.drawerActions}><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving}>{active ? 'Save changes' : 'Add vehicle'}</Button></div>
      </Form>
    </Drawer>
  </>;
}
