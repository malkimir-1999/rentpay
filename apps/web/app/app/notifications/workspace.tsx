'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, List, Skeleton, Space, Tag, Typography, message } from 'antd';
import { PageHeader } from '../../../components/ui';

type Notice = { id: string; event: string; status: string; title: string | null; message: string | null; readAt: string | null; createdAt: string };

export function NotificationsWorkspace() {
  const [rows, setRows] = useState<Notice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    setFailed(false);
    try {
      const response = await fetch('/api/account/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load notifications.');
      setRows(await response.json() as Notice[]);
    } catch { setFailed(true); }
  }
  useEffect(() => { void load(); }, []);
  async function markRead(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/account/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Could not update this notification.');
      setRows((current) => current?.map((row) => row.id === id ? { ...row, readAt: new Date().toISOString() } : row) ?? null);
    } catch (error) { message.error(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(null); }
  }
  return <Space direction="vertical" size="large" className="rp-full-width">
    <PageHeader title="Notifications" description="Updates for your business workspace, in one place." />
    {failed && <Alert type="error" showIcon message="We could not load notifications." action={<Button onClick={() => void load()}>Try again</Button>} />}
    <Card>{rows === null && !failed ? <Skeleton active /> : rows?.length ? <List dataSource={rows} renderItem={(row) => <List.Item actions={!row.readAt ? [<Button key="read" type="link" loading={busy === row.id} onClick={() => void markRead(row.id)}>Mark as read</Button>] : []}>
      <List.Item.Meta title={<Space wrap><Typography.Text strong={!row.readAt}>{row.title ?? row.event.replaceAll('_', ' ').toLowerCase()}</Typography.Text>{!row.readAt && <Tag color="green">New</Tag>}</Space>} description={<><span>{row.message ?? 'There is an update for your account.'}</span><br /><Typography.Text type="secondary">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.createdAt))}</Typography.Text></>} />
    </List.Item>} /> : <Empty description="No notifications yet. Important updates will appear here." />}</Card>
  </Space>;
}
