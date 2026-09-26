'use client';

import { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MoneyDisplay } from '../../../components/ui';
import styles from './maintenance.module.css';

type Vehicle = { id: string; make: string; model: string; registrationNumber: string; odometerKm: number; currency: string };
type WorkOrder = { id: string; vehicleId: string; title: string; status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; dueAt: string | null; dueOdometerKm: number | null; scheduledStartAt: string | null; expectedEndAt: string | null; blocksAvailability: boolean; vendorName: string | null; estimatedCostMinor: number | null; actualCostMinor: number | null; currency: string; vehicle: Vehicle };
type WorkOrderForm = { vehicleId: string; title: string; dueAt?: string; dueOdometerKm?: number; scheduledStartAt?: string; expectedEndAt?: string; blocksAvailability: boolean; vendorName?: string; estimatedCost?: number };
function errorMessage(value: unknown) { const detail = (value as { error?: { message?: string | string[] } } | null)?.error?.message; return (Array.isArray(detail) ? detail[0] : detail) ?? 'We could not save this change. Please try again.'; }
function dateLabel(value: string | null) { return value ? new Date(value).toLocaleString() : 'Not set'; }

export function MaintenanceWorkspace({ initialOrders, vehicles, canManage }: { initialOrders: WorkOrder[]; vehicles: Vehicle[]; canManage: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState<{ order: WorkOrder; action: 'complete' | 'cancel' }>();
  const [toast, holder] = message.useMessage();
  const [form] = Form.useForm<WorkOrderForm>();
  const [finishForm] = Form.useForm<{ note: string; actualCost?: number }>();
  const selectedVehicleId: string | undefined = Form.useWatch('vehicleId', form);

  async function save(values: WorkOrderForm) {
    setSaving(true); setError('');
    try {
      const { estimatedCost, ...fields } = values;
      const response = await fetch('/api/app/maintenance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fields, estimatedCostMinor: estimatedCost === undefined ? undefined : Math.round(estimatedCost * 100), dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined, scheduledStartAt: values.scheduledStartAt ? new Date(values.scheduledStartAt).toISOString() : undefined, expectedEndAt: values.expectedEndAt ? new Date(values.expectedEndAt).toISOString() : undefined }) });
      const result = await response.json() as WorkOrder;
      if (!response.ok) throw new Error(errorMessage(result));
      setOrders((current) => [result, ...current]); form.resetFields(); await toast.success('Service work order planned.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'Work order could not be saved.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  async function transition(order: WorkOrder, action: 'start' | 'complete' | 'cancel', values?: { note: string; actualCost?: number }) {
    setSaving(true); setError('');
    try {
      const body = action === 'complete' ? { completionNotes: values?.note, actualCostMinor: values?.actualCost === undefined ? undefined : Math.round(values.actualCost * 100) } : action === 'cancel' ? { reason: values?.note } : {};
      const response = await fetch(`/api/app/maintenance/${encodeURIComponent(order.id)}/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json() as WorkOrder;
      if (!response.ok) throw new Error(errorMessage(result));
      setOrders((current) => current.map((item) => item.id === result.id ? result : item));
      setFinishing(undefined); finishForm.resetFields(); await toast.success(action === 'start' ? 'Service started. Availability has been updated.' : action === 'complete' ? 'Service completed. Inspect the vehicle before making it ready.' : 'Work order cancelled.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'Work order could not be updated.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  const columns: ColumnsType<WorkOrder> = [
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => `${row.vehicle.make} ${row.vehicle.model} · ${row.vehicle.registrationNumber}` },
    { title: 'Work', dataIndex: 'title' },
    { title: 'Due', key: 'due', render: (_, row) => row.dueAt ? dateLabel(row.dueAt) : row.dueOdometerKm === null ? 'No reminder set' : `${row.dueOdometerKm.toLocaleString()} km` },
    { title: 'Cost', key: 'cost', render: (_, row) => row.actualCostMinor !== null ? <MoneyDisplay amountMinor={row.actualCostMinor} currency={row.currency} /> : row.estimatedCostMinor !== null ? <><MoneyDisplay amountMinor={row.estimatedCostMinor} currency={row.currency} /> estimated</> : 'Not set' },
    { title: 'Availability', dataIndex: 'blocksAvailability', render: (value: boolean) => value ? 'Blocks during service' : 'No booking block' },
    { title: 'Status', dataIndex: 'status', render: (value: WorkOrder['status']) => <Tag color={value === 'COMPLETED' ? 'green' : value === 'IN_PROGRESS' ? 'blue' : value === 'CANCELLED' ? 'default' : 'gold'}>{value.replaceAll('_', ' ')}</Tag> },
    { title: 'Next step', key: 'action', render: (_, row) => !canManage ? 'View only' : row.status === 'PLANNED' ? <div className={styles.actions}><Button size="small" onClick={() => void transition(row, 'start')} loading={saving}>Start service</Button><Button size="small" onClick={() => setFinishing({ order: row, action: 'cancel' })}>Cancel</Button></div> : row.status === 'IN_PROGRESS' ? <div className={styles.actions}><Button size="small" type="primary" onClick={() => setFinishing({ order: row, action: 'complete' })}>Complete</Button><Button size="small" onClick={() => setFinishing({ order: row, action: 'cancel' })}>Cancel</Button></div> : 'Finished' },
  ];

  return <section className={styles.workspace}>
    {holder}{error ? <Alert type="error" showIcon message={error} /> : null}
    {canManage && <Card className={styles.card} title={<h2>Plan vehicle service</h2>}><p>Set a due date or mileage reminder. Add a service window if this vehicle must be unavailable to customers.</p>
      <Form form={form} layout="vertical" initialValues={{ blocksAvailability: true }} onFinish={(values) => void save(values)}>
        <div className={styles.fields}><Form.Item label="Vehicle" name="vehicleId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Choose vehicle" options={vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}` }))} /></Form.Item><Form.Item label="Service needed" name="title" rules={[{ required: true, min: 3, max: 120 }]}><Input maxLength={120} placeholder="For example, replace brake pads" /></Form.Item><Form.Item label="Due date (optional)" name="dueAt"><Input type="datetime-local" /></Form.Item><Form.Item label="Due at odometer (km, optional)" name="dueOdometerKm"><InputNumber min={0} precision={0} /></Form.Item><Form.Item label="Service start (optional)" name="scheduledStartAt"><Input type="datetime-local" /></Form.Item><Form.Item label="Expected completion (optional)" name="expectedEndAt"><Input type="datetime-local" /></Form.Item><Form.Item label="Workshop or vendor (optional)" name="vendorName"><Input maxLength={120} /></Form.Item><Form.Item label={`Estimated cost (${vehicles.find((vehicle) => vehicle.id === selectedVehicleId)?.currency ?? 'business currency'}, optional)`} name="estimatedCost"><InputNumber min={0} max={21474836.47} precision={2} /></Form.Item></div>
        <Form.Item label="Keep vehicle out of bookings during service" name="blocksAvailability" valuePropName="checked"><Switch /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Plan service</Button>
      </Form>
    </Card>}
    <Card className={styles.card} title="Service work orders"><Table rowKey="id" columns={columns} dataSource={orders} scroll={{ x: 980 }} pagination={{ pageSize: 10, showSizeChanger: false }} locale={{ emptyText: 'No service work planned yet. Add a work order to track what needs attention.' }} /></Card>
    <Modal open={Boolean(finishing)} title={finishing?.action === 'complete' ? 'Complete service' : 'Cancel work order'} onCancel={() => setFinishing(undefined)} footer={null} destroyOnHidden><Form form={finishForm} layout="vertical" onFinish={(values) => { if (finishing) void transition(finishing.order, finishing.action, values); }}><Form.Item label={finishing?.action === 'complete' ? 'What work was completed?' : 'Why is this work cancelled?'} name="note" rules={[{ required: true, min: 3 }]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>{finishing?.action === 'complete' && <Form.Item label={`Actual cost (${finishing.order.currency}, optional)`} name="actualCost"><InputNumber min={0} max={21474836.47} precision={2} /></Form.Item>}<Button type="primary" htmlType="submit" loading={saving}>Confirm</Button></Form></Modal>
  </section>;
}
