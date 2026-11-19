import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STORED_TIME,
  fixedClock,
  InMemoryClockStorage,
  StoredClock,
  SystemClock,
} from '../src/index.js';

const NOON = Temporal.Instant.from('2026-01-01T12:00:00Z');

describe('SystemClock', () => {
  it('returns the current time', async () => {
    const before = Temporal.Now.instant();
    const now = await new SystemClock().now();
    const after = Temporal.Now.instant();

    expect(Temporal.Instant.compare(before, now)).toBeLessThanOrEqual(0);
    expect(Temporal.Instant.compare(now, after)).toBeLessThanOrEqual(0);
  });
});

describe('fixedClock', () => {
  it('stays at the given time', async () => {
    const clock = await fixedClock(NOON);

    expect((await clock.now()).equals(NOON)).toBe(true);
    expect((await clock.now()).equals(NOON)).toBe(true);
  });

  it('can be moved to another time', async () => {
    const clock = await fixedClock(NOON);
    const anHourLater = NOON.add({ hours: 1 });

    await clock.changeTime(anHourLater);

    expect((await clock.now()).equals(anHourLater)).toBe(true);
  });

  it('does not share time between clocks', async () => {
    const first = await fixedClock(NOON);
    const second = await fixedClock(NOON);

    await first.changeTime(NOON.add({ hours: 24 }));

    expect((await second.now()).equals(NOON)).toBe(true);
  });
});

describe('StoredClock', () => {
  it('starts at the default time when nothing is stored', async () => {
    const clock = new StoredClock(new InMemoryClockStorage());

    expect((await clock.now()).equals(DEFAULT_STORED_TIME)).toBe(true);
  });

  it('starts at a chosen initial time when nothing is stored', async () => {
    const clock = new StoredClock(new InMemoryClockStorage(), NOON);

    expect((await clock.now()).equals(NOON)).toBe(true);
  });

  it('reads the time back from its storage', async () => {
    const storage = new InMemoryClockStorage();
    await new StoredClock(storage).changeTime(NOON);

    const otherClockOnSameStorage = new StoredClock(storage);

    expect((await otherClockOnSameStorage.now()).equals(NOON)).toBe(true);
  });

  it('fails on a stored value that is not an instant', async () => {
    const storage = new InMemoryClockStorage();
    await storage.save('not a time');

    await expect(new StoredClock(storage).now()).rejects.toThrow(RangeError);
  });
});
