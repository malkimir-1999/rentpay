import { MarketingFrame, PageIntro } from '../../../components/marketing';
import styles from '../../marketing.module.css';
import { pageMetadata } from '../../../lib/seo';
export const metadata = pageMetadata({ title: 'Privacy information', description: 'How RentPay handles account, business and customer information in its rental operations service.', path: '/legal/privacy' });
export default function PrivacyPage() { return <MarketingFrame><main className={styles.contentPage}><PageIntro eyebrow="Legal" title="Privacy information" description="Last updated September 23, 2026. This service information should be reviewed against the operating company, providers and applicable law before production launch." /><article className={styles.legalText}>
  <h2>Information RentPay handles</h2><p>RentPay processes account details such as name, email and phone; business workspace details; and information that a rental business chooses to enter about its customers, vehicles and rental operations.</p>
  <h2>How information is used</h2><p>Information is used to provide sign-in, tenant workspaces, rental-business setup, customer-facing pages, support and service security. Business information is available to the business users permitted by that business’s access controls.</p>
  <h2>Security and service providers</h2><p>RentPay uses access controls and tenant-scoped data access. The service may rely on infrastructure, storage, email and monitoring providers to operate. Those providers and retention periods must be identified in the final production policy.</p>
  <h2>Retention and requests</h2><p>Account and business records are retained to operate the service and meet applicable obligations. A final policy must define exact retention periods, deletion requests and the responsible legal entity and contact address before public launch.</p>
  <h2>Cookies and sessions</h2><p>Authenticated areas use secure session cookies to keep users signed in. Public marketing pages do not require a user account.</p>
  <h2>Questions or requests</h2><p>For privacy requests, contact the RentPay service operator through its verified support channel. The verified legal entity and support contact must be published before production use.</p>
  </article></main></MarketingFrame>; }
