import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(12).max(256) });
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(32).optional().or(z.literal('')).transform((value) => value || undefined),
  country: z.enum(['PK', 'GB', 'AE', 'US']),
  businessName: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(256),
  termsAccepted: z.literal(true),
});
export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(254) });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: z.string().min(12).max(256), confirmPassword: z.string().min(12).max(256) }).refine((value) => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
export type RegistrationInput = z.infer<typeof registrationSchema>;
