'use client';

import { useState } from 'react';
import { Alert, Button, Drawer, Empty, Form, Input, Popconfirm, Space, Table, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '../../../components/ui';
import styles from './locations.module.css';

export type BusinessLocation = { id: string; name: string; timezone: string; address: string | null; phone: string | null; _count: { vehicles: number } };
type Values = Pick<BusinessLocation, 'name' | 'timezone'> & { address?: string; phone?: string };

export function LocationsWorkspace({ initialLocations }: { initialLocations: BusinessLocation[] }) {
  const [locations, setLocations] = useState(initialLocations);
  const [active, setActive] = useState<BusinessLocation | undefined>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, contextHolder] = message.useMessage();
  const [form] = Form.useForm<Values>();

  function startCreate() { setActive(undefined); setError(''); form.resetFields(); form.setFieldsValue({ timezone: 'Asia/Karachi' }); setOpen(true); }
  function startEdit(location: BusinessLocation) { setActive(location); setError(''); form.setFieldsValue({ name: location.name, timezone: location.timezone, address: location.address ?? '', phone: location.phone ?? '' }); setOpen(true); }

  async function save(values: Values) {
    setSaving(true); setError('');
    try {
      const response = await fetch(active ? `/api/app/locations/${encodeURIComponent(active.id)}` : '/api/app/locations', {
        method: active ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => null) as BusinessLocation | { error?: { message?: string | string[] } } | null;
      if (!response.ok) {
        const detail = (result as { error?: { message?: string | string[] } } | null)?.error?.message;
        throw new Error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not save this location. Please try again.');
      }
      const location = result as BusinessLocation;
      setLocations((current) => active ? current.map((item) => item.id === location.id ? location : item).sort((a, b) => a.name.localeCompare(b.name)) : [...current, location].sort((a, b) => a.name.localeCompare(b.name)));
      await toast.success(active ? 'Location details saved.' : 'Location added.');
      setOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not save this location. Please try again.'); }
    finally { setSaving(false); }
  }

  async function archive(location: BusinessLocation) {
    const response = await fetch(`/api/app/locations/${encodeURIComponent(location.id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const result = await response.json().catch(() => null) as { error?: { message?: string | string[] } } | null;
      const detail = result?.error?.message;
      await toast.error(Array.isArray(detail) ? detail[0] : detail ?? 'We could not archive this location.');
      return;
    }
    setLocations((current) => current.filter((item) => item.id !== location.id));
    await toast.success(`${location.name} was archived.`);
  }

  const columns: ColumnsType<BusinessLocation> = [
    { title: 'Location', dataIndex: 'name', key: 'name', render: (name: string, location) => <div className={styles.locationName}><strong>{name}</strong><span>{location.address || 'No address added'}</span></div> },
    { title: 'Timezone', dataIndex: 'timezone', key: 'timezone' },
    { title: 'Contact', dataIndex: 'phone', key: 'phone', render: (phone?: string | null) => phone || '—' },
    { title: 'Active vehicles', key: 'vehicles', render: (_, location) => location._count.vehicles },
    { title: 'Actions', key: 'actions', render: (_, location) => <Space wrap><Button type="text" icon={<EditOutlined />} aria-label={`Edit ${location.name}`} onClick={() => startEdit(location)}>Edit</Button><Tooltip title={location._count.vehicles ? 'Move active vehicles before archiving this location.' : undefined}><span><Popconfirm title="Archive this location?" description="It will no longer be available for new vehicle assignments." okText="Archive location" cancelText="Keep location" onConfirm={() => archive(location)} disabled={location._count.vehicles > 0}><Button type="text" danger disabled={location._count.vehicles > 0} aria-label={`Archive ${location.name}`}>Archive</Button></Popconfirm></span></Tooltip></Space> },
  ];

  return <>
    {contextHolder}
    <PageHeader title="Locations" description="Manage where customers pick up and return vehicles." action={<Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>Add location</Button>} />
    <section className={styles.panel} aria-label="Business locations">
      <div className={styles.panelHeading}><div><h2>Your locations</h2><p>Locations are private to your business and can be updated any time.</p></div><span>{locations.length} {locations.length === 1 ? 'location' : 'locations'}</span></div>
      {locations.length ? <Table rowKey="id" columns={columns} dataSource={locations} pagination={{ pageSize: 10, responsive: true }} scroll={{ x: 720 }} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add the first place where customers collect vehicles."><Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>Add your first location</Button></Empty>}
    </section>
    <Drawer title={active ? 'Edit location' : 'Add a location'} open={open} onClose={() => setOpen(false)} size="large" destroyOnHidden>
      {error && <Alert className={styles.error} type="error" showIcon title={error} role="alert" />}
      <Form form={form} layout="vertical" onFinish={save} requiredMark="optional">
        <Form.Item label="Location name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter a name for this location.' }, { min: 2, max: 100 }]}><Input autoComplete="organization-title" /></Form.Item>
        <Form.Item label="Timezone" name="timezone" rules={[{ required: true, message: 'Choose the local timezone.' }]}><Input placeholder="e.g. Asia/Karachi" /></Form.Item>
        <Form.Item label="Pickup address" name="address"><Input autoComplete="street-address" /></Form.Item>
        <Form.Item label="Contact phone" name="phone"><Input type="tel" autoComplete="tel" /></Form.Item>
        <div className={styles.actions}><Button onClick={() => setOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving}>{active ? 'Save changes' : 'Add location'}</Button></div>
      </Form>
    </Drawer>
  </>;
}
