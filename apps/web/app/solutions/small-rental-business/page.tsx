import { ContentPage } from '../../../components/marketing';
import { pageMetadata } from '../../../lib/seo';
export const metadata = pageMetadata({ title: 'RentPay for small rental businesses', description: 'Keep bookings, customers, vehicles, handovers and payment follow-ups manageable for a small rental team.', path: '/solutions/small-rental-business' });
export default function SmallBusinessPage() { return <ContentPage eyebrow="For independent operators" title="Less time searching. More time serving customers." description="When the owner is also answering messages, checking vehicles and arranging handovers, simple coordination matters." sections={[
 { title: 'One clear view of the day', body: 'Keep upcoming pickups, returns and follow-ups visible instead of spread across messages and paper.' },
 { title: 'Setup that starts small', body: 'Add your business details, one location and a first vehicle. Leave optional setup for later.' },
 { title: 'A customer-ready page', body: 'Share a hosted page with your vehicles and contact details so renters know how to reach you.' },
]} />; }
