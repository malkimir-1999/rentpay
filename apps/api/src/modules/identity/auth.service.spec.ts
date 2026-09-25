import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './auth.service';
describe('password utilities', () => {
 it('stores only a salted scrypt digest and verifies the original password', async () => {
  const hashed = await hashPassword('strong-password-2026');
  expect(hashed).not.toContain('strong-password-2026');
  expect(await verifyPassword('strong-password-2026', hashed)).toBe(true);
  expect(await verifyPassword('wrong-password-2026', hashed)).toBe(false);
 });
});
