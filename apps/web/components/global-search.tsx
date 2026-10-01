'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Empty, Input, List, Modal, Spin, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styles from './global-search.module.css';

type SearchResult = { id: string; type: string; title: string; detail: string; status?: string; href: string };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); setFailed(false); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (!open || normalized.length < 2) { setResults([]); setLoading(false); setFailed(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      void fetch(`/api/app/search?${new URLSearchParams({ query: normalized })}`, { cache: 'no-store', signal: controller.signal })
        .then(async (response) => { if (!response.ok) throw new Error('Search is unavailable.'); return response.json() as Promise<{ results: SearchResult[] }>; })
        .then((payload) => { setResults(payload.results); setFailed(false); })
        .catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return; setFailed(true); setResults([]); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  return <>
    <Button className={styles.trigger} icon={<SearchOutlined aria-hidden="true" />} onClick={() => setOpen(true)} aria-label="Search your workspace">
      <span>Search</span><kbd>Ctrl K</kbd>
    </Button>
    <Modal className={styles.dialog} title="Search your workspace" open={open} onCancel={close} footer={null} destroyOnHidden>
      <Input autoFocus size="large" prefix={<SearchOutlined aria-hidden="true" />} placeholder="Find a vehicle, customer, booking or rental" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search vehicles, customers, bookings and rentals" allowClear />
      <div className={styles.results} aria-live="polite">
        {loading ? <div className={styles.feedback}><Spin size="small" /> <span>Searching your workspace…</span></div> : null}
        {!loading && failed ? <Empty description="Search is temporarily unavailable. Try again." /> : null}
        {!loading && !failed && query.trim().length < 2 ? <p className={styles.hint}>Type at least 2 characters. Results follow your role and workspace access.</p> : null}
        {!loading && !failed && query.trim().length >= 2 && results.length === 0 ? <Empty description="No matching records. Try a name, phone or vehicle registration." /> : null}
        {!loading && results.length > 0 ? <List dataSource={results} rowKey={(item) => `${item.type}:${item.id}`} renderItem={(item) => <List.Item className={styles.result}><Link href={item.href as never} onClick={close}><span className={styles.resultText}><span className={styles.resultHeading}>{item.title}<Tag>{item.type}</Tag>{item.status && <Tag color="green">{item.status.replaceAll('_', ' ').toLowerCase()}</Tag>}</span><span className={styles.detail}>{item.detail}</span></span></Link></List.Item>} /> : null}
      </div>
    </Modal>
  </>;
}
