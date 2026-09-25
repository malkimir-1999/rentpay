import type { NextConfig } from 'next';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const workspaceEnv = resolve(process.cwd(), '../../.env');
if (existsSync(workspaceEnv)) process.loadEnvFile(workspaceEnv);

const config: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      { key: 'X-Frame-Options', value: 'DENY' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
    ] }];
  },
};
export default config;
