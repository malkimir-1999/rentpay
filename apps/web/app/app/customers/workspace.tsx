'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { PageHeader } from '../../../components/ui';
import styles from './customers.module.css';

type VerifyState = 'NOT_REVIEWED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type CustomerStatus = 'ACTIVE' | 'RESTRICTED';
export type BusinessDriver = { id: string; customerId: string; fullName: string; phone: string; licenseNumber: string | null; licenseCountry: string | null; licenseExpiresAt: string | null; verification: VerifyState; notes: string | null };
export type BusinessCustomer = { id: string; fullName: string; email: string | null; phone: string; address: string | null; notes: string | null; status: CustomerStatus; verification: VerifyState; _count: { drivers: number }; drivers?: BusinessDriver[] };
type CustomerValues = Pick<BusinessCustomer, 'fullName' | 'phone'> & { email?: string; address?: string; notes?: string; status?: CustomerStatus; verification?: VerifyState };
type DriverValues = Pick<BusinessDriver, 'fullName' | 'phone'> & { licenseNumber?: string; licenseCountry?: string; licenseExpiresAt?: string; verification?: VerifyState; notes?: string };

const verifyLabels: Record<VerifyState, string> = { NOT_REVIEWED: 'Not reviewed', PENDING: 'Needs review', VERIFIED: 'Verified', REJECTED: 'Not approved' };
const verifyColors: Record<VerifyState, string> = { NOT_REVIEWED: 'default', PENDING: 'gold', VERIFIED: 'green', REJECTED: 'volcano' };

async function readFailure(response: Response) {
  const result = await response.json().catch(() => null) as { error?: { message?: string | string[] } } | null;
  const detail = result?.error?.message;
  return (Array.isArray(detail) ? detail[0] : detail) ?? 'We could not save these details. Please try again.';
}

export function CustomersWorkspace({ initialCustomers, canManage }: { initialCustomers: BusinessCustomer[]; canManage: boolean }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BusinessCustomer>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, contextHolder] = message.useMessage();
  const [customerForm] = Form.useForm<CustomerValues>();
  const [driverForm] = Form.useForm<DriverValues>();

  const visibleCustomers = useMemo(() => customers.filter((customer) => `${customer.fullName} ${customer.email ?? ''} ${customer.phone}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [customers, search]);

  function createCustomer() { setSelected(undefined); setError(''); customerForm.resetFields(); setEditOpen(true); }
  function editCustomer(customer: BusinessCustomer) { setSelected(customer); setError(''); customerForm.setFieldsValue({ fullName: customer.fullName, email: customer.email ?? '', phone: customer.phone, address: customer.address ?? '', notes: customer.notes ?? '', status: customer.status, verification: customer.verification }); setEditOpen(true); }

  async function saveCustomer(values: CustomerValues) {
    setSaving(true); setError('');
    try {
      const response = await fetch(selected ? `/api/app/customers/${encodeURIComponent(selected.id)}` : '/api/app/customers', { method: selected ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error(await readFailure(response));
      const saved = await response.json() as BusinessCustomer;
      setCustomers((current) => selected ? current.map((customer) => customer.id === saved.id ? { ...customer, ...saved } : customer) : [...current, saved].sort((left, right) => left.fullName.localeCompare(right.fullName)));
      await toast.success(selected ? 'Customer record updated.' : 'Customer added.');
      setEditOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not save this customer.'); }
    finally { setSaving(false); }
  }

  async function showCustomer(customer: BusinessCustomer) {
    setSelected(customer); setError(''); setDetailOpen(true);
    const response = await fetch(`/api/app/customers/${encodeURIComponent(customer.id)}`);
    if (!response.ok) { setError(await readFailure(response)); return; }
    setSelected(await response.json() as BusinessCustomer);
  }

  async function addDriver(values: DriverValues) {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/app/customers/${encodeURIComponent(selected.id)}/drivers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error(await readFailure(response));
      const updated = await fetch(`/api/app/customers/${encodeURIComponent(selected.id)}`).then((result) => result.json()) as BusinessCustomer;
      setSelected(updated); setCustomers((current) => current.map((item) => item.id === updated.id ? { ...item, _count: updated._count } : item));
      driverForm.resetFields(); setDriverOpen(false); await toast.success('Driver added to this customer.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not add this driver.'); }
    finally { setSaving(false); }
  }

  async function archive(customer: BusinessCustomer) {
    const response = await fetch(`/api/app/customers/${encodeURIComponent(customer.id)}`, { method: 'DELETE' });
    if (!response.ok) { await toast.error(await readFailure(response)); return; }
    setCustomers((current) => current.filter((item) => item.id !== customer.id));
    if (selected?.id === customer.id) { setDetailOpen(false); setSelected(undefined); }
    await toast.success(`${customer.fullName} was archived.`);
  }

  const columns: ColumnsType<BusinessCustomer> = [
    { title: 'Customer', dataIndex: 'fullName', key: 'fullName', render: (name: string, customer) => <button className={styles.customerLink} type="button" onClick={() => void showCustomer(customer)}>{name}</button> },
    { title: 'Contact', key: 'contact', render: (_, customer) => <div className={styles.contact}><span>{customer.phone}</span><span>{customer.email || 'Email not added'}</span></div> },
    { title: 'Drivers', dataIndex: ['_count', 'drivers'], key: 'drivers', responsive: ['md'] },
    { title: 'Identity check', dataIndex: 'verification', key: 'verification', render: (state: VerifyState) => <Tag color={verifyColors[state]}>{verifyLabels[state]}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: CustomerStatus) => <Tag color={status === 'ACTIVE' ? 'green' : 'volcano'}>{status === 'ACTIVE' ? 'Active' : 'Restricted'}</Tag> },
    ...(canManage ? [{ title: 'Actions', key: 'actions', render: (_: unknown, customer: BusinessCustomer) => <Space wrap><Button type="text" icon={<EditOutlined />} aria-label={`Edit ${customer.fullName}`} onClick={() => editCustomer(customer)}>Edit</Button><Popconfirm title="Archive this customer?" description="Their details will be hidden from active lists. Existing records remain preserved." okText="Archive customer" cancelText="Keep customer" onConfirm={() => void archive(customer)}><Button type="text" danger>Archive</Button></Popconfirm></Space> } satisfies ColumnsType<BusinessCustomer>[number]] : []),
  ];

  return <section className={styles.workspace}>
    {contextHolder}
    <PageHeader title="Customers & drivers" description="Keep renter contact details and driver checks together, ready for a reservation." action={canManage ? <Button type="primary" icon={<PlusOutlined />} onClick={createCustomer}>Add customer</Button> : undefined} />
    <Card className={styles.listCard}>
      <div className={styles.listHeader}><div><h2>Customer list</h2><p>{visibleCustomers.length} {visibleCustomers.length === 1 ? 'customer' : 'customers'} shown</p></div><Input.Search aria-label="Search customers" placeholder="Search name, phone or email" allowClear value={search} onChange={(event) => setSearch(event.target.value)} className={styles.search} /></div>
      {visibleCustomers.length ? <Table rowKey="id" columns={columns} dataSource={visibleCustomers} pagination={{ pageSize: 10, showSizeChanger: false }} scroll={{ x: 720 }} onRow={(customer) => ({ onDoubleClick: () => void showCustomer(customer) })} /> : <Empty description={search ? 'No customers match that search.' : 'No customers yet. Add your first renter record when you are ready.'}>{canManage && !search ? <Button type="primary" icon={<PlusOutlined />} onClick={createCustomer}>Add customer</Button> : null}</Empty>}
    </Card>

    <Drawer title={selected?.fullName ?? 'Add customer'} open={editOpen} onClose={() => setEditOpen(false)} width={520} destroyOnClose>
      <Form form={customerForm} layout="vertical" onFinish={saveCustomer} requiredMark="optional">
        {error ? <Alert className={styles.formAlert} type="error" showIcon message={error} /> : null}
        <Form.Item label="Customer name" name="fullName" rules={[{ required: true, min: 2, message: 'Enter the renter’s full name.' }]}><Input autoComplete="name" maxLength={120} /></Form.Item>
        <Form.Item label="Phone" name="phone" rules={[{ required: true, min: 5, message: 'Add a phone number so staff can contact the renter.' }]}><Input autoComplete="tel" maxLength={32} /></Form.Item>
        <Form.Item label="Email" name="email"><Input type="email" autoComplete="email" maxLength={254} /></Form.Item>
        <Form.Item label="Address" name="address"><Input maxLength={300} /></Form.Item>
        {selected ? <Space className={styles.formRow} size="middle"><Form.Item label="Customer status" name="status"><Select options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'RESTRICTED', label: 'Restricted' }]} /></Form.Item><Form.Item label="Identity check" name="verification"><Select options={Object.entries(verifyLabels).map(([value, label]) => ({ value, label }))} /></Form.Item></Space> : null}
        <Form.Item label="Staff notes" name="notes" extra="Only your team can see these notes."><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        <div className={styles.formActions}><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving}>{selected ? 'Save changes' : 'Add customer'}</Button></div>
      </Form>
    </Drawer>

    <Drawer title={selected?.fullName ?? 'Customer'} open={detailOpen} onClose={() => setDetailOpen(false)} width={560}>
      {error ? <Alert className={styles.formAlert} type="error" showIcon message={error} /> : null}
      {selected ? <>
        <Descriptions column={1} bordered size="small" items={[{ key: 'phone', label: 'Phone', children: selected.phone }, { key: 'email', label: 'Email', children: selected.email || 'Not added' }, { key: 'address', label: 'Address', children: selected.address || 'Not added' }, { key: 'identity', label: 'Identity check', children: verifyLabels[selected.verification] }, { key: 'notes', label: 'Staff notes', children: selected.notes || 'No notes' }]} />
        <div className={styles.driverHeader}><div><h2>Drivers</h2><p>People approved to drive on this customer’s bookings.</p></div>{canManage ? <Button icon={<UserAddOutlined />} onClick={() => { setError(''); driverForm.resetFields(); setDriverOpen(true); }}>Add driver</Button> : null}</div>
        {selected.drivers?.length ? <div className={styles.driverList}>{selected.drivers.map((driver) => <Card size="small" key={driver.id}><div className={styles.driverCard}><strong>{driver.fullName}</strong><Tag color={verifyColors[driver.verification]}>{verifyLabels[driver.verification]}</Tag></div><p>{driver.phone}</p><p>{driver.licenseNumber ? `Licence ${driver.licenseNumber}${driver.licenseCountry ? ` · ${driver.licenseCountry}` : ''}` : 'Driving licence not recorded'}</p></Card>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No additional drivers added." />}
      </> : <Card loading />}
    </Drawer>

    <Drawer title="Add driver" open={driverOpen} onClose={() => setDriverOpen(false)} width={480}>
      <Form form={driverForm} layout="vertical" onFinish={addDriver} requiredMark="optional">
        {error ? <Alert className={styles.formAlert} type="error" showIcon message={error} /> : null}
        <Form.Item label="Driver name" name="fullName" rules={[{ required: true, min: 2, message: 'Enter the driver’s full name.' }]}><Input autoComplete="name" maxLength={120} /></Form.Item>
        <Form.Item label="Phone" name="phone" rules={[{ required: true, min: 5, message: 'Add a phone number for this driver.' }]}><Input autoComplete="tel" maxLength={32} /></Form.Item>
        <Form.Item label="Licence number" name="licenseNumber"><Input maxLength={80} autoComplete="off" /></Form.Item>
        <Form.Item label="Licence country code" name="licenseCountry" extra="For example, PK or AE."><Input maxLength={2} /></Form.Item>
        <Form.Item label="Licence expiry date" name="licenseExpiresAt"><Input type="date" /></Form.Item>
        <Form.Item label="Identity check" name="verification" initialValue="NOT_REVIEWED"><Select options={Object.entries(verifyLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        <Form.Item label="Staff notes" name="notes"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        <div className={styles.formActions}><Button onClick={() => setDriverOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving}>Add driver</Button></div>
      </Form>
    </Drawer>
  </section>;
}
