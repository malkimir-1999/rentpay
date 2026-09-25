import { ContentPage } from '../../components/marketing';
import { pageMetadata } from '../../lib/seo';
export const metadata = pageMetadata({ title: 'About RentPay', description: 'Learn what RentPay is designed to help independent car-rental teams do every day.', path: '/about' });
export default function AboutPage() { return <ContentPage eyebrow="About RentPay" title="Rental work deserves a clearer home." description="RentPay is being built around the everyday work that keeps an independent rental business moving: knowing what is booked, which vehicle is ready and what needs attention next." sections={[
 { title: 'Grounded in the rental lifecycle', body: 'Bookings, verification, handover, active rentals, returns and settlement are connected parts of one operation.' },
 { title: 'Designed for the whole team', body: 'Owners, managers and frontline staff need clear language, sensible defaults and access that fits their work.' },
 { title: 'Built with care for business data', body: 'Each business workspace is isolated. Platform, business and customer access follow separate security boundaries.' },
]} />; }
