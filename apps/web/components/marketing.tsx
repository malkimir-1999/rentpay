import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightOutlined, CheckCircleFilled } from './marketing-icons';
import styles from '../app/marketing.module.css';
import { ScrollReveal } from './scroll-reveal';

const navigation = [
  { label: 'Features', href: '/features' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'FAQ', href: '/faq' },
] as const;

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={styles.brand} href="/" aria-label="RentPay home"><span className={styles.brandMark}>R</span>{!compact && <span>RentPay</span>}</Link>;
}

export function MarketingHeader() {
  return <header className={styles.header}>
    <div className={styles.headerInner}>
      <Brand />
      <nav className={styles.desktopNav} aria-label="Main navigation">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      <div className={styles.headerActions}><Link className={styles.loginLink} href="/login">Log in</Link><Link className={styles.buttonSmall} href="/register">Start free trial <ArrowRightOutlined aria-hidden="true" /></Link></div>
      <details className={styles.mobileNav}><summary aria-label="Open navigation" aria-haspopup="true"><span></span><span></span><span></span></summary><nav aria-label="Mobile navigation">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/login">Log in</Link><Link className={styles.mobileTrial} href="/register">Start 30-day free trial <ArrowRightOutlined aria-hidden="true" /></Link></nav></details>
    </div>
  </header>;
}

export function MarketingFooter() {
  return <footer className={styles.footer}><div className={styles.footerInner}>
    <div className={styles.footerBrand}><Brand /><p>A clearer way to run the work behind every rental.</p><span className={styles.footerNote}>Built for rental teams, from first request to vehicle return.</span></div>
    <div className={styles.footerLinks}>
      <div><strong>Explore</strong><Link href="/features">Product features</Link><Link href="/how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/solutions">Solutions</Link></div>
      <div><strong>RentPay</strong><Link href="/about">About</Link><Link href="/contact">Contact & demo</Link><Link href="/faq">FAQs</Link></div>
      <div><strong>Legal</strong><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link><Link href="/login">Workspace sign in</Link></div>
    </div>
    <div className={styles.copyright}><span>© {new Date().getFullYear()} RentPay</span><span>Rental work, in one place.</span></div>
  </div></footer>;
}

export function MarketingFrame({ children }: { children: ReactNode }) { return <><a className={styles.skipLink} href="#main-content">Skip to content</a><MarketingHeader />{children}<MarketingFooter /><ScrollReveal /></>; }

export function PageIntro({ eyebrow, title, description, align = 'center' }: { eyebrow: string; title: string; description: string; align?: 'center' | 'left' }) {
  return <div className={`${styles.pageIntro} ${align === 'left' ? styles.pageIntroLeft : ''}`}><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>;
}

type ContentSection = { title: string; body: string; bullets?: string[] };
export function ContentPage({ eyebrow, title, description, sections, cta = true }: { eyebrow: string; title: string; description: string; sections: ContentSection[]; cta?: boolean }) {
  return <MarketingFrame><main id="main-content" className={styles.contentPage}>
    <PageIntro eyebrow={eyebrow} title={title} description={description} />
    <div className={styles.storyList}>{sections.map((section, index) => <section className={styles.storyRow} data-rp-reveal key={section.title}>
      <span className={styles.storyIndex}>{String(index + 1).padStart(2, '0')}</span>
      <div className={styles.storyCopy}><span className={styles.storyKicker}>{index % 2 === 0 ? 'A clearer way to work' : 'Built around real rental days'}</span><h2>{section.title}</h2><p>{section.body}</p></div>
      <div className={styles.storyDetail}>{section.bullets?.length ? <ul>{section.bullets.map((item) => <li key={item}><CheckCircleFilled aria-hidden="true" /><span>{item}</span></li>)}</ul> : <p>{section.body}</p>}</div>
    </section>)}</div>
    {cta && <CallToAction />}
  </main></MarketingFrame>;
}

export function CallToAction() {
  return <section className={styles.cta} data-rp-reveal><div className={styles.ctaCopy}><span className={styles.eyebrow}>Start with the work you do today</span><h2>Make the next rental easier to manage.</h2><p>Set up your workspace, add the essentials and explore RentPay for 30 days.</p><div className={styles.ctaPerks}><span><CheckCircleFilled /> No card to get started</span><span><CheckCircleFilled /> Pause and finish setup later</span></div></div><Link className={styles.button} href="/register">Start your free trial <ArrowRightOutlined aria-hidden="true" /></Link></section>;
}
