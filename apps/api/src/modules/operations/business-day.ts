const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });

function dayKey(instant: Date, timeZone: string): number {
  const formatter = timeZone === 'UTC' ? calendar : new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const values = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
  return Number(values.year) * 10000 + Number(values.month) * 100 + Number(values.day);
}

function firstInstantAtOrAfterDay(key: number, timeZone: string, now: Date): Date {
  let low = now.getTime() - 2 * 86400000;
  let high = now.getTime() + 2 * 86400000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (dayKey(new Date(middle), timeZone) < key) low = middle + 1;
    else high = middle;
  }
  return new Date(low);
}

export function businessDayBounds(timeZone: string, now = new Date()) {
  const today = dayKey(now, timeZone);
  const nextDate = new Date(Date.UTC(Math.floor(today / 10000), Math.floor(today / 100) % 100 - 1, today % 100 + 1));
  const tomorrow = nextDate.getUTCFullYear() * 10000 + (nextDate.getUTCMonth() + 1) * 100 + nextDate.getUTCDate();
  return { today, start: firstInstantAtOrAfterDay(today, timeZone, now), end: firstInstantAtOrAfterDay(tomorrow, timeZone, now) };
}
