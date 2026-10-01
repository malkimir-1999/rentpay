'use client';

import { useState } from 'react';
import { Alert, Button, Form, Input, Select, Tag, message } from 'antd';
import { PageHeader } from '../../../components/ui';
import styles from './team.module.css';

type Member = { id: string; status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'; createdAt: string; user: { id: string; name: string | null; email: string; createdAt: string }; role: { id: string; key: string; name: string } };
type Invitation = { id: string; email: string; expiresAt: string; role: { name: string } };
type Role = { id: string; key: string; name: string };
export type TeamData = { members: Member[]; invitations: Invitation[]; roles: Role[] };

const descriptions: Record<string, string> = {
  ADMIN: 'Can manage most day-to-day business settings and team access.',
  OPERATIONS_MANAGER: 'Can coordinate bookings, rentals, vehicles and service work.',
  RESERVATIONS: 'Can handle booking requests, customers and pickup preparation.',
  FINANCE: 'Can record payments, manage deposits and review finance reports.',
  FLEET: 'Can manage vehicles, inspections and maintenance.',
  READ_ONLY: 'Can view workspace information without changing records.',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers }, cache: 'no-store' });
  const data = await response.json().catch(() => null) as T & { error?: { message?: string }; message?: string } | null;
  if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'We could not save that change. Please try again.');
  return data as T;
}

export function TeamWorkspace({ initialData, isOwner }: { initialData: TeamData; isOwner: boolean }) {
  const [data, setData] = useState(initialData);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  async function refresh() { setData(await request<TeamData>('app/team')); }
  async function updateMember(member: Member, change: { roleId?: string; status?: 'ACTIVE' | 'SUSPENDED' }) {
    setBusyId(member.id); setError(''); setFeedback('');
    try { await request(`app/team/${encodeURIComponent(member.id)}`, { method: 'PATCH', body: JSON.stringify(change) }); await refresh(); setFeedback('Team member updated.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not save that change.'); }
    finally { setBusyId(null); }
  }
  async function invite(values: { email: string; roleId: string }) {
    setBusyId('invite'); setError(''); setFeedback('');
    try { await request('app/invitations', { method: 'POST', body: JSON.stringify(values) }); await refresh(); setFeedback(`Invitation sent to ${values.email}.`); messageApi.success('Invitation sent'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not send the invitation.'); }
    finally { setBusyId(null); }
  }

  return <div className={styles.page}>
    {contextHolder}
    <PageHeader title="Team" description="Invite the people who help run your rentals, and give each person the access they need." />
    {error && <Alert className={styles.alert} type="error" showIcon message={error} closable onClose={() => setError('')} />}
    {feedback && <Alert className={styles.alert} type="success" showIcon message={feedback} closable onClose={() => setFeedback('')} />}

    <section className={styles.invitePanel} aria-labelledby="invite-heading">
      <div><h2 id="invite-heading">Invite a team member</h2><p>They’ll receive an email with a secure link to join this workspace.</p></div>
      {data.roles.length ? <Form className={styles.inviteForm} layout="vertical" onFinish={invite} initialValues={{ roleId: data.roles.find((role) => role.key === 'RESERVATIONS')?.id ?? data.roles.at(0)?.id }}>
        <Form.Item label="Work email" name="email" rules={[{ required: true, message: 'Enter their email address.' }, { type: 'email', message: 'Enter a valid email address.' }]}><Input type="email" autoComplete="email" placeholder="name@company.com" /></Form.Item>
        <Form.Item label="Role" name="roleId" rules={[{ required: true }]}><Select options={data.roles.filter((role) => role.key !== 'ADMIN' || isOwner).map((role) => ({ value: role.id, label: role.name }))} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busyId === 'invite'}>Send invitation</Button>
      </Form> : <Alert type="info" showIcon message="Team roles are not configured yet" description="Run the development seed or ask your platform administrator to set up available roles." />}
    </section>

    <section className={styles.section} aria-labelledby="members-heading">
      <div className={styles.sectionHeading}><div><h2 id="members-heading">People with access</h2><p>Changes take effect the next time a person uses RentPay.</p></div><Tag>{data.members.length} member{data.members.length === 1 ? '' : 's'}</Tag></div>
      {data.members.length ? <div className={styles.memberList}>{data.members.map((member) => <article className={styles.member} key={member.id}>
        <div className={styles.identity}><strong>{member.user.name || member.user.email}</strong><span>{member.user.email}</span></div>
        <div className={styles.role}><Select aria-label={`Role for ${member.user.email}`} value={member.role.id} disabled={member.role.key === 'OWNER' || (member.role.key === 'ADMIN' && !isOwner)} loading={busyId === member.id} onChange={(roleId) => void updateMember(member, { roleId })} options={data.roles.filter((role) => role.key !== 'ADMIN' || isOwner).map((role) => ({ value: role.id, label: role.name }))} /><small>{descriptions[member.role.key] ?? 'Workspace access based on this role.'}</small></div>
        <div className={styles.memberAction}>{member.role.key === 'OWNER' ? <Tag color="green">Owner</Tag> : <><Tag color={member.status === 'ACTIVE' ? 'green' : 'default'}>{member.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Tag><Button type="link" disabled={busyId === member.id} onClick={() => void updateMember(member, { status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{member.status === 'ACTIVE' ? 'Pause access' : 'Restore access'}</Button></>}</div>
      </article>)}</div> : <p>No one has joined this workspace yet.</p>}
    </section>

    <section className={styles.section} aria-labelledby="pending-heading">
      <div className={styles.sectionHeading}><div><h2 id="pending-heading">Invitations waiting for a reply</h2><p>Invitations expire after seven days. You can send another if one expires.</p></div></div>
      {data.invitations.length ? <ul className={styles.invitationList}>{data.invitations.map((invite) => <li key={invite.id}><span><strong>{invite.email}</strong><small>{invite.role.name}</small></span><Tag>Expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(invite.expiresAt))}</Tag></li>)}</ul> : <p>No pending invitations.</p>}
    </section>
  </div>;
}
