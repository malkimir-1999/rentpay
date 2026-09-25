import { ContentPage } from '../../components/marketing';
import { pageMetadata } from '../../lib/seo';
export const metadata = pageMetadata({ title: 'How RentPay works', description: 'Set up your rental business, add vehicles and give your team a clearer way to manage each rental.', path: '/how-it-works' });
export default function HowItWorksPage() { return <ContentPage eyebrow="How it works" title="Start simple. Build a better rental routine." description="RentPay guides you through the basics first, then gives your team one place to follow the rental lifecycle." sections={[
 { title: 'Create your workspace', body: 'Register your business and start a 30-day trial. Your owner account and business workspace are created together.', bullets: ['Add your name and business details', 'Verify your email', 'Continue into guided setup'] },
 { title: 'Set up the essentials', body: 'Add a location, the first vehicle, simple pricing and the payment methods your team accepts.', bullets: ['Sensible Pakistan defaults', 'Skip optional steps and return later', 'Changes save to your business workspace'] },
 { title: 'Share your rental page', body: 'Publish a hosted page with your business details and vehicles so customers can learn about your service and contact you.', bullets: ['Use a readable RentPay URL', 'Keep your contact details visible', 'Request-to-book is the default direction'] },
 { title: 'Keep the day moving', body: 'Use a connected operational timeline to coordinate requests, pickups, returns, payments and vehicle preparation as your product workspace grows.', bullets: ['Clear next actions', 'Shared rental history', 'Access based on each teammate’s role'] },
]} />; }
