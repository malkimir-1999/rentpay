import { ContentPage } from '../../components/marketing';
import { pageMetadata } from '../../lib/seo';
export const metadata = pageMetadata({ title: 'Rental operations features', description: 'Explore tools for rental operations, fleet visibility, customer records, payments, teams and booking experiences.', path: '/features' });
export default function FeaturesPage() { return <ContentPage eyebrow="Product features" title="The moving parts of a rental, connected." description="A practical set of tools for coordinating vehicles, customers and work—without asking your team to learn a complicated system." sections={[
 { title: 'Operations', body: 'See the day’s work and keep each rental moving through a clear sequence.', bullets: ['Today view for pickups, returns and follow-ups', 'Reservations and rental records', 'Guided checkout and return foundations', 'Overdue and extension visibility'] },
 { title: 'Fleet', body: 'Understand which vehicles are ready and which need attention before you promise availability.', bullets: ['Vehicle records and location', 'Availability visibility', 'Inspection and damage foundations', 'Maintenance reminders and documents'] },
 { title: 'Customers', body: 'Keep renter details close to the booking and rental history your team needs.', bullets: ['Customer profiles', 'Driver information foundations', 'Rental history', 'Clear customer follow-up'] },
 { title: 'Payments', body: 'Make recorded payments and outstanding balances easier to follow.', bullets: ['Rental payment method records', 'Deposit foundations', 'Receipts and additional charge foundations', 'Pakistan-first local subscription payment options'] },
 { title: 'Business management', body: 'Give people appropriate access and keep business setup together.', bullets: ['Team roles and permission controls', 'Multiple location foundations', 'Reports and business settings', 'Meaningful activity audit trail'] },
 { title: 'Customer experience', body: 'Make it easier for renters to understand your offer and contact your team.', bullets: ['Hosted public rental page', 'Vehicle browsing foundations', 'Customer portal foundation', 'Request-to-book direction'] },
]} />; }
