import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: ['/app/', '/platform/', '/portal/', '/dashboard/', '/login', '/register', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/invite'] }], sitemap: absoluteUrl('/sitemap.xml').toString() };
}
