import pino from 'pino';
export const appLogger = pino({ level: process.env.LOG_LEVEL ?? 'info', redact: ['password', 'passwordHash', 'token', 'authorization', 'cookie', 'proofAssetId'] });
