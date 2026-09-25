import Redis from 'ioredis';
import type { ThrottlerStorage } from '@nestjs/throttler';
type ThrottlerStorageRecord = { totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number };
export class RedisRateLimitStorage implements ThrottlerStorage {
 private readonly redis: Redis;
 constructor(url: string) { this.redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false }); }
 async increment(key: string, ttl: number, limit: number, blockDuration: number, _name: string): Promise<ThrottlerStorageRecord> {
  const result = await this.redis.eval("local hits=redis.call('INCR',KEYS[1]); if hits==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('PTTL',KEYS[1]); return {hits,ttl}", 1, key, String(ttl)) as [number, number];
  return { totalHits: Number(result[0]), timeToExpire: Number(result[1]), isBlocked: Number(result[0]) > limit, timeToBlockExpire: Number(result[0]) > limit ? blockDuration : 0 };
 }
}
