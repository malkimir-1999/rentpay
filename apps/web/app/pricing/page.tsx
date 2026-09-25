import Link from 'next/link';
import { BankOutlined, CheckCircleFilled } from '../../components/marketing-icons';
import { MarketingFrame, PageIntro, CallToAction } from '../../components/marketing';
import styles from '../marketing.module.css';
import { pageMetadata } from '../../lib/seo';
export const metadata = pageMetadata({ title: 'RentPay pricing and trial', description: 'Explore RentPay plans when available, start a 30-day free trial and learn about Pakistan-first subscription payment options.', path: '/pricing' });
type Plan = { id: string; name: string; amountMinor: number; currency: string; vehicleLimit: number | null; staffLimit: number | null; features: string[] };
async function getPlans(): Promise<Plan[]> {
  try { const response = await fetch(new URL('/api/public/plans', process.env.API_URL ?? 'http://localhost:4000'), { cache: 'no-store' }); return response.ok ? await response.json() as Plan[] : []; } catch { return []; }
}
const formatPrice = (plan: Plan) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: plan.currency, maximumFractionDigits: 0 }).format(plan.amountMinor / 100);
export default async function PricingPage() {
  const plans = Array.from(new Map((await getPlans()).map((plan) => [`${plan.name}|${plan.amountMinor}|${plan.currency}|${plan.vehicleLimit}|${plan.staffLimit}|${plan.features.join(',')}`, plan])).values());
  return <MarketingFrame><main id="main-content" className={styles.contentPage}><PageIntro eyebrow="Clear plans, no surprises" title="Try the workspace before you decide." description="Every new business starts with a 30-day trial. Explore the tools first, then choose a paid plan when you’re ready." />
    {plans.length ? <div className={styles.planGrid}>{plans.map((plan) => <article className={styles.planCard} data-rp-reveal key={plan.id}><span className={styles.eyebrow}>RentPay plan</span><h2>{plan.name}</h2><p className={styles.planPrice}>{formatPrice(plan)}<span> / month</span></p><ul>{plan.vehicleLimit !== null && <li>Up to {plan.vehicleLimit} vehicles</li>}{plan.staffLimit !== null && <li>Up to {plan.staffLimit} staff members</li>}{plan.features.map((feature) => <li key={feature}>{feature}</li>)}{!plan.features.length && plan.vehicleLimit === null && plan.staffLimit === null && <li>Plan details are available from your account team</li>}</ul><Link className={styles.button} href="/register">Start 30-day trial <CheckCircleFilled aria-hidden="true" /></Link></article>)}</div> : <section className={styles.formCard}><span className={styles.eyebrow}>Plans are being prepared</span><h2>Start with the full 30-day trial.</h2><p>We’ll show your business the current plan options when they’re configured. You can explore the workspace during your trial, with no placeholder prices on this page.</p><Link className={styles.button} href="/register">Start 30-day free trial</Link></section>}
    <section className={styles.paymentNote}><span><BankOutlined aria-hidden="true" /></span><div><h2>Local subscription payments</h2><p>Paid subscriptions can be submitted by Bank Transfer, Easypaisa or JazzCash for manual verification. You don’t need a card or a Stripe account.</p></div></section><CallToAction /></main></MarketingFrame>;
}
