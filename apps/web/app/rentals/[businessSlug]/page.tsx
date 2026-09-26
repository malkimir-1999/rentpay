import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '../../../lib/seo';
import styles from '../../marketing.module.css';
import { PublicBooking } from './public-booking';

type RentalSite = { name: string; slug: string; phone: string | null; email: string | null; address: string | null; settings: { currency: string }; vehicles: { id: string; make: string; model: string; year: number | null; dailyRateMinor: number; currency: string }[] };
const fetchSite = async (slug: string): Promise<RentalSite | null> => {
  try { const response = await fetch(new URL(`/api/public/rentals/${encodeURIComponent(slug)}`, process.env.API_URL ?? 'http://localhost:4000'), { next: { revalidate: 300 } }); return response.ok ? await response.json() as RentalSite : null; } catch { return null; }
};
export async function generateMetadata({ params }: { params: Promise<{ businessSlug: string }> }): Promise<Metadata> {
  const { businessSlug } = await params; const site = await fetchSite(businessSlug);
  if (!site) return { title: 'Rental page unavailable', robots: { index: false, follow: false } };
  return { title: `${site.name} — vehicle rental`, description: `Explore rental vehicles and contact ${site.name} to ask about availability.`, alternates: { canonical: absoluteUrl(`/rentals/${site.slug}`) }, openGraph: { title: `${site.name} vehicle rentals`, description: `See vehicles from ${site.name} and get in touch about rental availability.`, url: absoluteUrl(`/rentals/${site.slug}`), type: 'website' } };
}
const price = (minor: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
export default async function PublicRentalPage({ params }: { params: Promise<{ businessSlug: string }> }) {
  const { businessSlug } = await params; const site = await fetchSite(businessSlug); if (!site) notFound();
  return <main className={styles.publicSite}><header className={styles.publicHeader}><Link className={styles.brand} href="/"><span className={styles.brandMark}>R</span>{site.name}</Link><Link className={styles.buttonSmall} href="#booking">Check dates</Link></header><section className={styles.publicHero}><span className={styles.eyebrow}>Rent with confidence</span><h1>Find a vehicle for your next trip.</h1><p>Browse the vehicles offered by {site.name}. Check your dates and send a booking request in a few simple steps.</p><Link className={styles.button} href="#booking">Check availability</Link></section><section className={styles.publicVehicles} id="vehicles"><div className={styles.sectionHead}><span className={styles.eyebrow}>Our fleet</span><h2>Vehicles from {site.name}</h2><p>Rates shown are estimates. The rental team confirms availability and final details.</p></div>{site.vehicles.length ? <div className={styles.featureGrid}>{site.vehicles.map((vehicle) => <article className={styles.featureCard} key={vehicle.id}><span className={styles.featureIcon} aria-hidden="true">{vehicle.make.slice(0, 1)}</span><h3>{vehicle.make} {vehicle.model}</h3><p>{vehicle.year ? `${vehicle.year} · ` : ''}{price(vehicle.dailyRateMinor, vehicle.currency)} per day</p><p>Choose dates to check availability and request this vehicle.</p><Link className={styles.textLink} href="#booking">Check dates and request →</Link></article>)}</div> : <p className={styles.publicEmpty}>This business is preparing its vehicle list. Contact the team for current options.</p>}{site.email && <a className={styles.textLink} href={`mailto:${site.email}`}>Email {site.name}</a>}{site.phone && <a className={styles.textLink} href={`tel:${site.phone}`}>Call {site.phone}</a>}{site.address && <p className={styles.publicAddress}>{site.address}</p>}</section><PublicBooking slug={site.slug} /><footer className={styles.publicFooter}>Powered by <Link href="/">RentPay</Link></footer></main>;
}
