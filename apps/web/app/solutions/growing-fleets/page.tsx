import { ContentPage } from '../../../components/marketing';
import { pageMetadata } from '../../../lib/seo';
export const metadata = pageMetadata({ title: 'RentPay for growing rental fleets', description: 'Give growing car-rental teams clearer vehicle, location, permission and operational handoffs.', path: '/solutions/growing-fleets' });
export default function GrowingFleetsPage() { return <ContentPage eyebrow="For growing teams" title="Make the handoffs work as your fleet grows." description="More vehicles and more people make shared visibility and clear responsibilities essential to a dependable rental operation." sections={[
 { title: 'Keep teams aligned', body: 'Give staff a consistent place to check what is happening with customers, bookings and vehicles.' },
 { title: 'Separate access by responsibility', body: 'Use role-based permissions so team members can do their work without receiving unnecessary access.' },
 { title: 'Grow location by location', body: 'Organize operations around real rental locations while keeping the business workspace connected.' },
]} />; }
