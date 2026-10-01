'use client';

import { useState } from 'react';
import styles from './portal.module.css';

type Notice = { id: string; title: string | null; message: string | null; readAt: string | null; createdAt: string };

export function CustomerNotices({ initialNotices }: { initialNotices: Notice[] }) {
  const [notices, setNotices] = useState(initialNotices);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function markRead(id: string) {
    setBusy(id);
    setError('');
    try {
      const response = await fetch(`/api/account/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Could not update this message.');
      setNotices((current) => current.map((notice) => notice.id === id ? { ...notice, readAt: new Date().toISOString() } : notice));
    } catch { setError('We could not update that message. Please try again.'); }
    finally { setBusy(null); }
  }
  if (!notices.length) return null;
  return <section className={styles.section} aria-labelledby="notice-title"><div className={styles.sectionHeading}><div><h2 id="notice-title">Updates</h2><p>Messages from the rental teams you work with.</p></div><span className={styles.count}>{notices.filter((notice) => !notice.readAt).length}</span></div>
    {error && <p role="alert">{error}</p>}<ul className={styles.noticeList}>{notices.map((notice) => <li className={styles.notice} key={notice.id}><div><strong>{notice.title ?? 'Rental update'}</strong><p>{notice.message ?? 'There is an update to your account.'}</p><time dateTime={notice.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notice.createdAt))}</time></div>{!notice.readAt && <button type="button" disabled={busy === notice.id} onClick={() => void markRead(notice.id)}>{busy === notice.id ? 'Saving…' : 'Mark as read'}</button>}</li>)}</ul>
  </section>;
}
