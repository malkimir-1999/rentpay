import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/seo';
export const dynamic = 'force-dynamic';

const publicPaths = ['/', '/features', '/how-it-works', '/pricing', '/solutions', '/solutions/small-rental-business', '/solutions/growing-fleets', '/about', '/contact', '/faq', '/legal/privacy', '/legal/terms'];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = publicPaths.map((path) => ({ url: absoluteUrl(path).toString(), changeFrequency: 'weekly' as const }));
  try {
    const response = await fetch(new URL('/api/public/rentals', process.env.API_URL ?? 'http://localhost:4000'), { next: { revalidate: 3600 } });
    if (!response.ok) return staticPages;
    const sites = await response.json() as { slug: string; updatedAt: string }[];
    return [...staticPages, ...sites.map((site) => ({ url: absoluteUrl(`/rentals/${site.slug}`).toString(), lastModified: new Date(site.updatedAt), changeFrequency: 'weekly' as const }))];
  } catch { return staticPages; }
}
