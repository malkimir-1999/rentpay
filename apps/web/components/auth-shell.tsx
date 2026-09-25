import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircleFilled, SafetyCertificateOutlined } from './marketing-icons';
import { MarketingHeader, MarketingFooter } from './marketing';
import styles from '../app/marketing.module.css';

export function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <><MarketingHeader /><main id="main-content" className={styles.authPage}><div className={styles.authLayout}>
    <aside className={styles.authVisual} aria-label="RentPay for rental teams"><Image src="/images/marketing/silver-crossover-cutout.png" alt="Silver rental crossover" fill sizes="(max-width: 768px) 0px, 52vw" loading="eager" /><div className={styles.authVisualContent}><span className={styles.eyebrow}>One clear rental workspace</span><h2>Keep the next step clear for everyone.</h2><p>Bring your rental day together, from the first customer request to a vehicle ready for its next trip.</p><ul className={styles.authBenefits}><li><CheckCircleFilled /> Guided setup with sensible defaults</li><li><CheckCircleFilled /> Your team’s work in one private place</li><li><SafetyCertificateOutlined /> Permission-aware business access</li></ul></div></aside>
    <section className={styles.authPanel} aria-label={title}><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}<div className={styles.authBack}><Link href="/">← Back to RentPay</Link></div></section>
  </div></main><MarketingFooter /></>;
}
