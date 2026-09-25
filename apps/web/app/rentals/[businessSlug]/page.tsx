import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '../../../lib/seo';
import styles from '../../marketing.module.css';

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
  return <main className={styles.publicSite}><header className={styles.publicHeader}><Link className={styles.brand} href="/"><span className={styles.brandMark}>R</span>{site.name}</Link><Link className={styles.buttonSmall} href="#vehicles">Explore vehicles</Link></header><section className={styles.publicHero}><span className={styles.eyebrow}>Rent with confidence</span><h1>Find a vehicle for your next trip.</h1><p>Browse the vehicles offered by {site.name}. Contact the rental team to check dates, location and availability.</p>{site.phone && <a className={styles.button} href={`tel:${site.phone}`}>Call {site.phone}</a>}</section><section className={styles.publicVehicles} id="vehicles"><div className={styles.sectionHead}><span className={styles.eyebrow}>Available fleet</span><h2>Vehicles from {site.name}</h2><p>Availability is confirmed directly by the rental team.</p></div>{site.vehicles.length ? <div className={styles.featureGrid}>{site.vehicles.map((vehicle) => <article className={styles.featureCard} key={vehicle.id}><span className={styles.featureIcon} aria-hidden="true">{vehicle.make.slice(0, 1)}</span><h3>{vehicle.make} {vehicle.model}</h3><p>{vehicle.year ? `${vehicle.year} · ` : ''}{price(vehicle.dailyRateMinor, vehicle.currency)} per day</p><p>Ask the business to confirm availability and rental details.</p>{site.phone && <a className={styles.textLink} href={`tel:${site.phone}`}>Contact to ask about this vehicle →</a>}</article>)}</div> : <p className={styles.publicEmpty}>This business is preparing its vehicle list. Contact the team for current options.</p>}{site.email && <a className={styles.textLink} href={`mailto:${site.email}`}>Email {site.name}</a>}{site.address && <p className={styles.publicAddress}>{site.address}</p>}</section><footer className={styles.publicFooter}>Powered by <Link href="/">RentPay</Link></footer></main>;
}
