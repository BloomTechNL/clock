import { Temporal } from 'temporal-polyfill';

import type { ChangeableClock } from './clock.js';
import { type ClockStorage, InMemoryClockStorage } from './clock-storage.js';

export const DEFAULT_STORED_TIME: Temporal.Instant = Temporal.Instant.from('2002-02-20T20:02:02Z');

export class StoredClock implements ChangeableClock {
  private readonly storage: ClockStorage;
  private readonly initialTime: Temporal.Instant;

  constructor(storage: ClockStorage, initialTime: Temporal.Instant = DEFAULT_STORED_TIME) {
    this.storage = storage;
    this.initialTime = initialTime;
  }

  async now(): Promise<Temporal.Instant> {
    const stored = await this.storage.load();
    return stored === undefined ? this.initialTime : Temporal.Instant.from(stored);
  }

  async changeTime(newTime: Temporal.Instant): Promise<void> {
    await this.storage.save(newTime.toString());
  }
}

export async function fixedClock(time: Temporal.Instant): Promise<ChangeableClock> {
  const clock = new StoredClock(new InMemoryClockStorage(), time);
  await clock.changeTime(time);
  return clock;
}
