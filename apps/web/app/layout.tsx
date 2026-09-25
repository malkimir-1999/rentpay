import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import '@fontsource-variable/inter';
import { Providers } from './providers';
import { absoluteUrl } from '../lib/seo';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { metadataBase: absoluteUrl('/'), title: { default: 'RentPay', template: '%s | RentPay' }, description: 'Rental business operations software', openGraph: { title: 'RentPay', description: 'Rental business operations software', type: 'website', url: absoluteUrl('/') }, twitter: { card: 'summary_large_image', title: 'RentPay', description: 'Rental business operations software' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-scroll-behavior="smooth"><body><AntdRegistry><Providers>{children}</Providers></AntdRegistry></body></html>; }
