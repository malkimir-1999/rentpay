import { MarketingFrame, PageIntro, CallToAction } from '../../components/marketing';
import { FaqAccordion } from '../../components/faq-accordion';
import styles from '../marketing.module.css';
import { jsonLd, pageMetadata } from '../../lib/seo';

export const metadata = pageMetadata({ title: 'Car rental software questions', description: 'Answers about RentPay setup, the free trial, rental workflows, booking pages and Pakistan subscription payments.', path: '/faq' });
const entries = [
  ['What is RentPay?', 'RentPay is a workspace for car-rental businesses to coordinate vehicles, bookings, customer details, handovers, returns and payment follow-ups.'],
  ['How long is the free trial?', 'The business trial lasts 30 days, starting when the business workspace is registered.'],
  ['Do I need technical experience?', 'No. Setup is guided, uses plain language and can be completed a step at a time. You can skip optional details and return later.'],
  ['Can my customers book a vehicle online?', 'A hosted business page can show your business and vehicles. The initial booking direction is request-to-book, so your team can review requests before confirming availability.'],
  ['How can I pay for a subscription in Pakistan?', 'Available payment instructions can support Bank Transfer, Easypaisa and JazzCash. A submitted reference is pending verification until approved.'],
  ['Can I add staff?', 'Business owners can invite staff and assign role-based access. Staff only receive the tenant and permissions associated with their membership.'],
  ['Are rental-customer payments the same as RentPay subscription payments?', 'No. Rental payments belong to the rental business and its customers; a RentPay subscription is a separate platform billing relationship.'],
];
const faqItems = entries.map(([question, answer], index) => ({ key: String(index + 1), label: question, children: <p>{answer}</p> }));

export default function FaqPage() {
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entries.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) };
  return <MarketingFrame><main id="main-content" className={`${styles.contentPage} ${styles.faqPage}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
    <PageIntro eyebrow="Questions, answered" title="Straight answers for rental teams." description="Useful details about getting started, running the work and supporting your renters." />
    <FaqAccordion className={styles.faqCollapse} items={faqItems} />
    <CallToAction />
  </main></MarketingFrame>;
}
