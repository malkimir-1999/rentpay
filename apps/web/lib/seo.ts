import type { Metadata } from 'next';

const siteUrl = process.env.WEB_URL ?? 'http://localhost:3000';

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl);
}

export function pageMetadata(input: { title: string; description: string; path: string }): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: absoluteUrl(input.path) },
    openGraph: { title: input.title, description: input.description, url: absoluteUrl(input.path), type: 'website' },
  };
}

export function jsonLd(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
