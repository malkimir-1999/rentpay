import { MarketingFrame, PageIntro } from '../../../components/marketing';
import styles from '../../marketing.module.css';
import { pageMetadata } from '../../../lib/seo';
export const metadata = pageMetadata({ title: 'Terms of service', description: 'Service terms covering RentPay accounts, business workspaces and responsible use.', path: '/legal/terms' });
export default function TermsPage() { return <MarketingFrame><main className={styles.contentPage}><PageIntro eyebrow="Legal" title="Terms of service" description="Last updated September 23, 2026. These service terms are a publication draft and require review and approval by the RentPay operating entity and qualified counsel before production launch." /><article className={styles.legalText}>
  <h2>Using RentPay</h2><p>RentPay provides software tools to help rental businesses organize vehicle, customer and rental operations. You are responsible for the accuracy and lawful use of information entered into your workspace.</p>
  <h2>Accounts and business access</h2><p>Keep your sign-in credentials secure and give team members only the access appropriate to their work. Business owners are responsible for their organization’s users, configuration and customer-facing information.</p>
  <h2>Trial and subscriptions</h2><p>New businesses receive a 30-day trial. Paid plan prices and limits are shown in RentPay when configured. Where manual local payment methods are available, a submitted payment reference remains pending until verified.</p>
  <h2>Acceptable use</h2><p>Do not attempt to access another business’s data, interfere with service security or use RentPay in violation of applicable law or third-party rights.</p>
  <h2>Availability and responsibility</h2><p>Software supports operational decisions but does not replace your business’s contracts, vehicle inspections, insurance, tax advice or legal obligations. Final production terms must specify service availability, liability, dispute handling, governing law, cancellation and data-processing terms.</p>
  <h2>Operator and contact details</h2><p>The legal operating entity, registered address, governing law and verified contact channel must be supplied and reviewed before these terms are accepted for production use.</p>
  </article></main></MarketingFrame>; }
