'use client';

import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, Progress, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '../../../components/ui';
import styles from './reports.module.css';

type VehicleUtilization = { id: string; make: string; model: string; registrationNumber: string; category: string | null; bookedHours: number; utilizationPercent: number };
export type UtilizationData = { from: string; to: string; vehicleCount: number; fleetUtilizationPercent: number; bookedHours: number; availableHours: number; vehicles: VehicleUtilization[] };

function dateValue(value: string) { return new Date(value).toISOString().slice(0, 10); }
function reportUrl(from: string, to: string) { const query = new URLSearchParams({ from: new Date(`${from}T00:00:00.000Z`).toISOString(), to: new Date(`${to}T23:59:59.999Z`).toISOString() }); return `/api/app/reports/utilization?${query}`; }

export function UtilizationReport({ initialData, canExport }: { initialData: UtilizationData; canExport: boolean }) {
  const [data, setData] = useState(initialData);
  const [from, setFrom] = useState(dateValue(initialData.from));
  const [to, setTo] = useState(dateValue(initialData.to));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function applyRange() {
    setBusy(true); setError('');
    try {
      if (!from || !to || to < from) throw new Error('Choose an end date on or after the start date.');
      const response = await fetch(reportUrl(from, to), { cache: 'no-store' });
      const result = await response.json() as UtilizationData | { error?: { message?: string } };
      if (!response.ok || !('vehicles' in result)) throw new Error('error' in result ? result.error?.message ?? 'We could not run this report.' : 'We could not run this report.');
      setData(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not run this report.'); }
    finally { setBusy(false); }
  }
  const exportUrl = `/api/app/reports/utilization/export?${new URLSearchParams({ from: new Date(`${from}T00:00:00.000Z`).toISOString(), to: new Date(`${to}T23:59:59.999Z`).toISOString() })}`;
  const columns: ColumnsType<VehicleUtilization> = [
    { title: 'Vehicle', key: 'vehicle', render: (_, row) => <div className={styles.vehicle}><strong>{row.make} {row.model}</strong><span>{row.registrationNumber} · {row.category ?? 'Rental vehicle'}</span></div> },
    { title: 'Booked time', dataIndex: 'bookedHours', render: (hours: number) => `${hours.toLocaleString()} hours` },
    { title: 'Utilization', dataIndex: 'utilizationPercent', render: (percent: number) => <Progress percent={percent} size="small" /> },
  ];
  return <Space direction="vertical" size="large" className="rp-full-width">
    <PageHeader title="Fleet utilization" description="See how much of each vehicle’s time was booked in a date range." action={canExport ? <Button href={exportUrl}>Download CSV</Button> : undefined} />
    <Card><div className={styles.filters}><label>From<Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><Button type="primary" loading={busy} onClick={() => void applyRange()}>Update report</Button></div>{error && <Alert className={styles.error} type="error" showIcon message={error} />}</Card>
    <div className={styles.metrics}><Card><span>Fleet utilization</span><strong>{data.fleetUtilizationPercent}%</strong></Card><Card><span>Booked time</span><strong>{data.bookedHours.toLocaleString()} hrs</strong></Card><Card><span>Vehicles included</span><strong>{data.vehicleCount}</strong></Card></div>
    <Card title="By vehicle">{data.vehicles.length ? <Table rowKey="id" columns={columns} dataSource={data.vehicles} pagination={{ pageSize: 10, responsive: true }} scroll={{ x: true }} /> : <Empty description="No active fleet vehicles were found in this workspace." />}</Card>
    <p className={styles.note}>Utilization is calculated from recorded rental dates only. It does not count unconfirmed requests as booked time.</p>
  </Space>;
}
