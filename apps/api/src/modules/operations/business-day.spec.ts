import { describe, expect, it } from 'vitest';
import { businessDayBounds } from './business-day';

describe('business day boundaries', () => {
  it('uses Pakistan local midnight rather than UTC midnight', () => {
    const result = businessDayBounds('Asia/Karachi', new Date('2026-09-25T20:00:00.000Z'));
    expect(result.today).toBe(20260926);
    expect(result.start.toISOString()).toBe('2026-09-25T19:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-09-26T19:00:00.000Z');
  });

  it('handles a daylight-saving transition without assuming a 24-hour day', () => {
    const result = businessDayBounds('America/New_York', new Date('2026-03-08T16:00:00.000Z'));
    expect(result.start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(result.end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});
