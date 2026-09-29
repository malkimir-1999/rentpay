'use client';

import { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Table, Tag, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload';
import { MoneyDisplay } from '../../../components/ui';
import styles from './inspections.module.css';
import { inspectionAreas, type VehicleConditionChecklist } from '../../../../../packages/config/src/inspection';

type VehicleOption = { id: string; make: string; model: string; registrationNumber: string; currency: string; odometerKm: number };
type Inspection = { id: string; vehicleId: string; rentalId: string | null; stage: 'PRE_HANDOVER' | 'RETURN' | 'MAINTENANCE_RELEASE'; checklist: Record<string, 'OK' | 'ISSUE'>; notes: string | null; odometerKm: number; fuelPercent: number; completedAt: string; vehicle: { make: string; model: string; registrationNumber: string }; evidence: { id: string; fileAsset: { id: string; mimeType: string; sizeBytes: number } | null }[] };
type DamageCase = { id: string; vehicleId: string; rentalId: string | null; title: string; description: string; status: 'OPEN' | 'QUOTED' | 'RESOLVED' | 'WAIVED'; estimatedMinor: number | null; finalMinor: number | null; resolutionNotes: string | null; vehicle: { make: string; model: string; registrationNumber: string } };
type StoredEvidence = { id: string; name: string };
type Checklist = VehicleConditionChecklist;
const statusColors: Record<DamageCase['status'], string> = { OPEN: 'red', QUOTED: 'gold', RESOLVED: 'green', WAIVED: 'default' };
function apiMessage(value: unknown) { const message = (value as { error?: { message?: string | string[] } } | null)?.error?.message; return (Array.isArray(message) ? message[0] : message) ?? 'We could not save this update. Try again.'; }

export function InspectionsWorkspace({ vehicles, initialInspections, initialDamageCases, canUpload }: { vehicles: VehicleOption[]; initialInspections: Inspection[]; initialDamageCases: DamageCase[]; canUpload: boolean }) {
  const [inspections, setInspections] = useState(initialInspections);
  const [damageCases, setDamageCases] = useState(initialDamageCases);
  const [evidence, setEvidence] = useState<StoredEvidence[]>([]);
  const [editingCase, setEditingCase] = useState<DamageCase>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, holder] = message.useMessage();
  const [inspectionForm] = Form.useForm<{ vehicleId: string; stage: Inspection['stage']; checklist: Checklist; odometerKm: number; fuelPercent: number; notes?: string }>();
  const [damageForm] = Form.useForm<{ vehicleId: string; title: string; description: string; estimatedMinor?: number }>();
  const [caseForm] = Form.useForm<{ status: DamageCase['status']; estimatedMinor?: number; finalMinor?: number; resolutionNotes?: string }>();

  async function upload(file: RcFile) {
    const body = new FormData(); body.append('file', file);
    try {
      const response = await fetch('/api/app/files', { method: 'POST', body });
      const result = await response.json() as { id?: string };
      if (!response.ok || !result.id) throw new Error(apiMessage(result));
      setEvidence((current) => [...current, { id: result.id!, name: file.name }]);
      await toast.success(`${file.name} uploaded securely.`);
    } catch (cause) { await toast.error(cause instanceof Error ? cause.message : 'File upload failed.'); }
  }

  async function saveInspection(values: { vehicleId: string; stage: Inspection['stage']; checklist: Checklist; odometerKm: number; fuelPercent: number; notes?: string }) {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/app/inspections', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...values, evidenceAssetIds: evidence.map((item) => item.id) }) });
      const record = await response.json() as Inspection;
      if (!response.ok) throw new Error(apiMessage(record));
      setInspections((current) => [record, ...current]); setEvidence([]); inspectionForm.resetFields();
      const newIssues = Object.values(values.checklist).filter((value) => value === 'ISSUE').length;
      if (newIssues) { const damages = await fetch('/api/app/inspections/damage-cases').then((res) => res.json()) as DamageCase[]; setDamageCases(damages); }
      await toast.success(newIssues ? `Inspection saved. ${newIssues} damage case${newIssues === 1 ? '' : 's'} opened for review.` : values.stage === 'MAINTENANCE_RELEASE' ? 'Service release passed. Vehicle is ready for bookings.' : 'Vehicle inspection saved.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'The inspection could not be saved.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  async function saveDamage(values: { vehicleId: string; title: string; description: string; estimatedMinor?: number }) {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/app/inspections/damage-cases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      const record = await response.json() as DamageCase;
      if (!response.ok) throw new Error(apiMessage(record));
      setDamageCases((current) => [record, ...current]); damageForm.resetFields(); await toast.success('Damage case recorded. The vehicle is marked as damaged.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'The damage case could not be saved.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  async function updateDamage(values: { status: DamageCase['status']; estimatedMinor?: number; finalMinor?: number; resolutionNotes?: string }) {
    if (!editingCase) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/app/inspections/damage-cases/${encodeURIComponent(editingCase.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(values) });
      const record = await response.json() as DamageCase;
      if (!response.ok) throw new Error(apiMessage(record));
      setDamageCases((current) => current.map((item) => item.id === record.id ? record : item)); setEditingCase(undefined); await toast.success('Damage case updated.');
    } catch (cause) { const detail = cause instanceof Error ? cause.message : 'The damage case could not be updated.'; setError(detail); await toast.error(detail); }
    finally { setSaving(false); }
  }

  const inspectionColumns: ColumnsType<Inspection> = [
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => `${row.vehicle.make} ${row.vehicle.model} · ${row.vehicle.registrationNumber}` },
    { title: 'Stage', dataIndex: 'stage', render: (stage: Inspection['stage']) => stage === 'PRE_HANDOVER' ? 'Before handover' : stage === 'RETURN' ? 'Vehicle return' : 'After service' },
    { title: 'Mileage', dataIndex: 'odometerKm', render: (value: number) => `${value.toLocaleString()} km` },
    { title: 'Result', key: 'result', render: (_, row) => Object.values(row.checklist).includes('ISSUE') ? <Tag color="red">Issues found</Tag> : <Tag color="green">No issues found</Tag> },
    { title: 'Evidence', key: 'evidence', render: (_, row) => `${row.evidence.length} file${row.evidence.length === 1 ? '' : 's'}` },
    { title: 'Notes', dataIndex: 'notes', render: (value: string | null) => value || '—' },
  ];
  const damageColumns: ColumnsType<DamageCase> = [
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => `${row.vehicle.make} ${row.vehicle.model} · ${row.vehicle.registrationNumber}` },
    { title: 'Issue', dataIndex: 'title' },
    { title: 'Estimate', dataIndex: 'estimatedMinor', render: (amount: number | null, row) => amount === null ? 'Not estimated' : <MoneyDisplay amountMinor={amount} currency={vehicles.find((item) => item.id === row.vehicleId)?.currency ?? 'PKR'} /> },
    { title: 'Status', dataIndex: 'status', render: (status: DamageCase['status']) => <Tag color={statusColors[status]}>{status.replaceAll('_', ' ')}</Tag> },
    { title: 'Action', key: 'action', render: (_, row) => row.status === 'RESOLVED' || row.status === 'WAIVED' ? 'Complete' : <Button type="link" onClick={() => { setEditingCase(row); caseForm.setFieldsValue({ status: row.status, estimatedMinor: row.estimatedMinor ?? undefined, finalMinor: row.finalMinor ?? undefined, resolutionNotes: row.resolutionNotes ?? undefined }); }}>Update case</Button> },
  ];

  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}` }));
  return <section className={styles.workspace}>
    {holder}
    {error ? <Alert type="error" showIcon message={error} /> : null}
    <div className={styles.forms}>
      <Card className={styles.card} title={<h2>Record vehicle inspection</h2>}>
        <p>Check each area before handover, at return, or after service. Mark issues clearly; RentPay will open a damage case for follow-up. A clear after-service check returns the vehicle to bookings.</p>
        <Form form={inspectionForm} layout="vertical" onFinish={(values) => void saveInspection(values)}>
          <Form.Item label="Vehicle" name="vehicleId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={vehicleOptions} placeholder="Choose a vehicle" /></Form.Item>
          <Form.Item label="Inspection stage" name="stage" rules={[{ required: true }]}><Select options={[{ value: 'PRE_HANDOVER', label: 'Before handover' }, { value: 'RETURN', label: 'Vehicle return' }, { value: 'MAINTENANCE_RELEASE', label: 'After service — release to bookings' }]} placeholder="Choose a stage" /></Form.Item>
          <div className={styles.checklist}>{inspectionAreas.map((area) => <Form.Item key={area.key} label={area.label} name={['checklist', area.key]} rules={[{ required: true, message: 'Choose OK or issue found.' }]}><Select options={[{ value: 'OK', label: 'Looks good' }, { value: 'ISSUE', label: 'Issue found' }]} /></Form.Item>)}</div>
          <div className={styles.checklist}><Form.Item label="Odometer (km)" name="odometerKm" rules={[{ required: true }, { type: 'number', min: 0 }]}><InputNumber min={0} precision={0} /></Form.Item><Form.Item label="Fuel level (%)" name="fuelPercent" rules={[{ required: true }, { type: 'number', min: 0, max: 100 }]}><InputNumber min={0} max={100} precision={0} /></Form.Item></div>
          <Form.Item label="Notes about the vehicle condition" name="notes"><Input.TextArea maxLength={2000} rows={3} /></Form.Item>
          {canUpload ? <Form.Item label="Photos or supporting document (optional)"><Upload beforeUpload={(file) => { void upload(file as RcFile); return Upload.LIST_IGNORE; }} showUploadList={false} multiple><Button>Upload evidence</Button></Upload><div className={styles.fileList}>{evidence.map((item) => <span key={item.id} className={styles.fileChip}>{item.name}</span>)}</div></Form.Item> : <Alert type="info" showIcon message="Your role can record the inspection. Ask a fleet manager to attach files if needed." />}
          <Button type="primary" htmlType="submit" loading={saving}>Save inspection</Button>
        </Form>
      </Card>
      <Card className={styles.card} title={<h2>Report vehicle damage</h2>}>
        <p>Record what happened and an optional estimate. The vehicle will be marked as damaged until your team reviews its condition.</p>
        <Form form={damageForm} layout="vertical" onFinish={(values) => void saveDamage(values)}>
          <Form.Item label="Vehicle" name="vehicleId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={vehicleOptions} placeholder="Choose a vehicle" /></Form.Item>
          <Form.Item label="Short title" name="title" rules={[{ required: true, min: 3, max: 120 }]}><Input maxLength={120} placeholder="For example, cracked rear light" /></Form.Item>
          <Form.Item label="What happened?" name="description" rules={[{ required: true, min: 10, max: 2000 }]}><Input.TextArea rows={4} maxLength={2000} /></Form.Item>
          <Form.Item label="Estimated repair cost (optional)" name="estimatedMinor"><InputNumber min={0} precision={0} /></Form.Item>
          <Button htmlType="submit" loading={saving}>Create damage case</Button>
        </Form>
      </Card>
    </div>
    <Card className={styles.tableCard} title="Recent inspections"><Table rowKey="id" columns={inspectionColumns} dataSource={inspections} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 760 }} locale={{ emptyText: 'No inspections yet. Record the vehicle condition before handover or at return.' }} /></Card>
    <Card className={styles.tableCard} title="Damage cases"><Table rowKey="id" columns={damageColumns} dataSource={damageCases} pagination={{ pageSize: 8, showSizeChanger: false }} scroll={{ x: 720 }} locale={{ emptyText: 'No damage cases. New issues from inspections will appear here.' }} /></Card>
    <Modal title="Update damage case" open={Boolean(editingCase)} onCancel={() => setEditingCase(undefined)} footer={null} destroyOnHidden>
      <Form form={caseForm} layout="vertical" onFinish={(values) => void updateDamage(values)}>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}><Select options={[{ value: 'OPEN', label: 'Open' }, { value: 'QUOTED', label: 'Repair quoted' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'WAIVED', label: 'Waived' }]} /></Form.Item>
        <Form.Item label="Estimated cost (minor units)" name="estimatedMinor"><InputNumber min={0} precision={0} /></Form.Item>
        <Form.Item label="Final cost (minor units)" name="finalMinor"><InputNumber min={0} precision={0} /></Form.Item>
        <Form.Item label="Resolution note (required to resolve or waive)" name="resolutionNotes"><Input.TextArea rows={3} maxLength={1000} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Save case update</Button>
      </Form>
    </Modal>
  </section>;
}
