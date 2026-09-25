import Link from 'next/link';
import { MarketingFrame, PageIntro } from '../../components/marketing';
import styles from '../marketing.module.css';
import { pageMetadata } from '../../lib/seo';
import { ContactForm } from './contact-form';
export const metadata = pageMetadata({ title: 'Contact RentPay', description: 'Start a 30-day RentPay trial or sign in to your existing rental business workspace.', path: '/contact' });
export default function ContactPage() { return <MarketingFrame><main className={styles.contentPage}><PageIntro eyebrow="Contact & demo" title="Let’s talk about your rental operation." description="Tell us a little about your business and what you need. For a quick, self-guided look, you can also start your 30-day trial." /><section className={styles.formCard}><ContactForm /><div className={styles.authLinks}><Link href="/register">Start 30-day free trial</Link><Link href="/login">Already have an account? Log in</Link></div></section></main></MarketingFrame>; }
