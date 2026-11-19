import { Temporal } from 'temporal-polyfill';

export interface Clock {
  now(): Promise<Temporal.Instant>;
}

export interface ChangeableClock extends Clock {
  changeTime(newTime: Temporal.Instant): Promise<void>;
}

export class SystemClock implements Clock {
  async now(): Promise<Temporal.Instant> {
    return Temporal.Now.instant();
  }
}
