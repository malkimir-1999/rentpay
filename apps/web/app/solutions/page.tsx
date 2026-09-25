import { ContentPage } from '../../components/marketing';
import { pageMetadata } from '../../lib/seo';
export const metadata = pageMetadata({ title: 'Solutions for rental businesses', description: 'Find a practical starting point for an owner-led rental business or a growing multi-location fleet.', path: '/solutions' });
export default function SolutionsPage() { return <ContentPage eyebrow="Solutions" title="Built around the way rental teams work." description="Whether you are coordinating a small fleet yourself or supporting several locations, the goal is the same: make the next rental easier to run." sections={[
 { title: 'Small rental businesses', body: 'Replace scattered notes with a clear, manageable workspace for the owner and staff.', bullets: ['Get started without complex configuration', 'See bookings, vehicles and follow-ups together', 'Give staff only the access they need'] },
 { title: 'Growing fleets', body: 'Make handoffs and vehicle visibility more consistent as teams and locations grow.', bullets: ['Keep location context attached to the work', 'Make roles and responsibilities clearer', 'Build a reliable operating routine across the team'] },
]} />; }
