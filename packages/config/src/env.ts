import { z } from 'zod';
export const envSchema = z.object({
 DATABASE_URL: z.string().url(),
 AUTH_SECRET: z.string().min(32),
 API_URL: z.string().url(),
 WEB_URL: z.string().url(),
 LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info'),
 NODE_ENV: z.enum(['development','test','production']).default('development'),
 PORT: z.coerce.number().int().positive().default(4000),
 REDIS_URL: z.string().url().optional(),
 SMTP_HOST: z.string().optional(),
 SMTP_PORT: z.coerce.number().int().positive().default(587),
 SMTP_USER: z.string().optional(),
 SMTP_PASSWORD: z.string().optional(),
 SMTP_FROM: z.string().optional(),
 CONTACT_EMAIL: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
 SUBSCRIPTION_BANK_TRANSFER_INSTRUCTIONS: z.string().optional(),
 SUBSCRIPTION_EASYPAISA_INSTRUCTIONS: z.string().optional(),
 SUBSCRIPTION_JAZZCASH_INSTRUCTIONS: z.string().optional()
}).superRefine((config, context) => {
 if (config.NODE_ENV === 'production' && !config.REDIS_URL) context.addIssue({ code: 'custom', message: 'REDIS_URL is required in production', path: ['REDIS_URL'] });
 if (config.NODE_ENV === 'production' && (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASSWORD || !config.SMTP_FROM)) context.addIssue({ code: 'custom', message: 'SMTP settings are required in production', path: ['SMTP_HOST'] });
 if (config.NODE_ENV === 'production' && !config.CONTACT_EMAIL) context.addIssue({ code: 'custom', message: 'CONTACT_EMAIL is required in production', path: ['CONTACT_EMAIL'] });
 if (config.NODE_ENV === 'production' && (!config.SUBSCRIPTION_BANK_TRANSFER_INSTRUCTIONS || !config.SUBSCRIPTION_EASYPAISA_INSTRUCTIONS || !config.SUBSCRIPTION_JAZZCASH_INSTRUCTIONS)) context.addIssue({ code: 'custom', message: 'All Pakistan manual subscription payment instructions are required in production', path: ['SUBSCRIPTION_BANK_TRANSFER_INSTRUCTIONS'] });
});
