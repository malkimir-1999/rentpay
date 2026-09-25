'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Alert, Button, Drawer, Empty, Input, Layout, Menu, Popconfirm, Skeleton, Table, Tag, Timeline } from 'antd';
import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import styles from './ui.module.css';
type NavigationItem = { key: string; label: string; href: Route };
const menuItems = (navigation: NavigationItem[]) => navigation.map((item) => ({ key: item.key, label: <Link href={item.href}>{item.label}</Link> }));
export function AppShell({ children, navigation, selectedKey, workspace }: { children: ReactNode; navigation: NavigationItem[]; selectedKey: string; workspace: string }) { const [open, setOpen] = useState(false); return <Layout className={styles.shell}><Sidebar navigation={navigation} selectedKey={selectedKey} workspace={workspace} /><Layout><Topbar workspace={workspace}><Button className={styles.mobileMenu} aria-label="Open navigation" icon={<MenuOutlined />} onClick={() => setOpen(true)} /></Topbar><Drawer title="RentPay navigation" placement="left" open={open} onClose={() => setOpen(false)}><Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems(navigation)} onClick={() => setOpen(false)} /></Drawer><main className={styles.main}>{children}</main></Layout></Layout>; }
export function Sidebar({ navigation, selectedKey, workspace }: { navigation: NavigationItem[]; selectedKey: string; workspace: string }) { return <Layout.Sider trigger={null} breakpoint="lg" collapsedWidth="0" className={styles.sidebar}><Link className={styles.brand} href="/"><span className={styles.brandMark}>R</span><span>RentPay<small>{workspace}</small></span></Link><Menu mode="inline" selectedKeys={[selectedKey]} items={menuItems(navigation)} /></Layout.Sider>; }
export function Topbar({ children, workspace }: { children?: ReactNode; workspace: string }) { return <header className={styles.topbar}><div className={styles.topbarStart}>{children}<strong>{workspace}</strong></div><Link className={styles.signOut} href="/logout"><LogoutOutlined aria-hidden="true" /> Sign out</Link></header>; }
export function PageContainer({ children }: { children: ReactNode }) { return <div className={styles.pageContainer}>{children}</div>; }
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <header className="rp-page-header"><div><h1 className="rp-heading">{title}</h1>{description && <p className="rp-muted">{description}</p>}</div>{action}</header>; }
export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) { return <section className={styles.section}>{(title || action) && <header className={styles.sectionHeader}><h2>{title}</h2>{action}</header>}{children}</section>; }
export function StatusBadge({ status }: { status: string }) { return <Tag color={status.toLowerCase().includes('ready') || status.toLowerCase().includes('paid') ? 'green' : 'default'}>{status}</Tag>; }
export function EmptyState({ title = 'Nothing here yet', description, action }: { title?: string; description?: string; action?: ReactNode }) { return <Empty description={<span>{title}{description && <><br /><small>{description}</small></>}</span>}>{action}</Empty>; }
export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) { return <Alert type="error" title={message} action={onRetry && <Button onClick={onRetry}>Try again</Button>} />; }
export function LoadingState() { return <Skeleton active />; }
export function SearchInput({ placeholder = 'Search' }: { placeholder?: string }) { return <Input.Search aria-label={placeholder} placeholder={placeholder} allowClear />; }
export function FilterBar({ children }: { children: ReactNode }) { return <div className={styles.filterBar}>{children}</div>; }
export function ConfirmAction({ title, children, onConfirm }: { title: string; children: ReactNode; onConfirm: () => void }) { return <Popconfirm title={title} onConfirm={onConfirm}>{children}</Popconfirm>; }
export function DataTable<T extends object>({ columns, rows, rowKey }: { columns: ColumnsType<T>; rows: T[]; rowKey: keyof T }) { return <Table<T> columns={columns} dataSource={rows} rowKey={(row) => String(row[rowKey])} scroll={{ x: true }} pagination={{ responsive: true }} />; }
export function ActivityTimeline({ items }: { items: Array<{ title: string; description?: string; date: string }> }) { return <Timeline items={items.map((item) => ({ children: <div><strong>{item.title}</strong><p>{item.description}</p><time>{item.date}</time></div> }))} />; }
export function MoneyDisplay({ amountMinor, currency = 'PKR' }: { amountMinor: number; currency?: string }) { return <>{new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100)}</>; }
export function DateTimeDisplay({ value, timeZone = 'Asia/Karachi' }: { value: string | Date; timeZone?: string }) { const date = new Date(value); return <time dateTime={date.toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date)}</time>; }
export function ResponsiveDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) { return <Drawer open={open} onClose={onClose} title={title}>{children}</Drawer>; }
