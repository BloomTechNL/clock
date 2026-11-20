# Clock

A testable clock built on the [Temporal API](https://tc39.es/proposal-temporal/docs/).

`@bloom-group/clock` lets your code ask a `Clock` for the time instead of reading it directly, so you decide what time it is: the real time in production, a fixed time in unit tests, and a time you can move forward in acceptance tests or simulations.

## Why a clock?

Code that calls `Date.now()` or `Temporal.Now.instant()` is hard to test. You can't write a reliable test for "an order expires after 30 days" when the code reads the real time. Injecting a clock makes time an ordinary dependency:

```ts
import type { Clock } from '@bloom-group/clock';

class OrderService {
  constructor(private readonly clock: Clock) {}

  async createOrder(data: OrderData) {
    return { ...data, createdAt: await this.clock.now() };
  }
}
```

## Installation

```bash
npm install @bloom-group/clock temporal-polyfill
```

`temporal-polyfill` is a peer dependency, so your code and the clock share the same `Temporal` types. The package is ESM-only.

## Basic usage

### In production: `SystemClock`

```ts
import { SystemClock } from '@bloom-group/clock';

const service = new OrderService(new SystemClock());
```

### In unit tests: `fixedClock`

`fixedClock` stays at the time you give it until you move it.

```ts
import { fixedClock } from '@bloom-group/clock';
import { Temporal } from 'temporal-polyfill';

const clock = await fixedClock(Temporal.Instant.from('2026-01-01T12:00:00Z'));
const service = new OrderService(clock);

await clock.changeTime((await clock.now()).add({ hours: 24 * 30 }));
```

## Moving time across processes: `StoredClock`

A `StoredClock` keeps its time in a `ClockStorage`, so several clocks (or processes) that share the storage share the time. Use this when an acceptance test runs against a separately started server and needs to move the server's time.

```ts
import { StoredClock } from '@bloom-group/clock';
import { FileClockStorage } from '@bloom-group/clock/file';

const clock = new StoredClock(new FileClockStorage('/tmp/my-app/clock.txt'));

await clock.now(); // the stored time, or 2002-02-20T20:02:02Z when nothing is stored yet
await clock.changeTime(Temporal.Instant.from('2026-06-01T09:00:00Z'));
```

Pass a second argument to start somewhere else: `new StoredClock(storage, initialTime)`.

### Storages

| Storage                | Import                    | Keeps the time          |
| ---------------------- | ------------------------- | ----------------------- |
| `InMemoryClockStorage` | `@bloom-group/clock`      | in memory (one process) |
| `FileClockStorage`     | `@bloom-group/clock/file` | in a file (Node.js)     |

`FileClockStorage` lives in its own entry point because it uses `node:fs`; the main entry point has no Node.js dependencies.

### Your own storage

Anything that can load and save a string works, such as a database row, Redis or blob storage:

```ts
import type { ClockStorage } from '@bloom-group/clock';

class RedisClockStorage implements ClockStorage {
  constructor(
    private readonly redis: Redis,
    private readonly key: string,
  ) {}

  async load() {
    return (await this.redis.get(this.key)) ?? undefined;
  }

  async save(value: string) {
    await this.redis.set(this.key, value);
  }
}
```

The stored value is an ISO 8601 instant such as `2026-01-01T12:00:00Z`. A value that isn't one makes `now()` reject with a `RangeError`.

## API

| Export                 | Description                                                             |
| ---------------------- | ----------------------------------------------------------------------- |
| `Clock`                | `now(): Promise<Temporal.Instant>`                                      |
| `ChangeableClock`      | A `Clock` with `changeTime(newTime: Temporal.Instant): Promise<void>`   |
| `SystemClock`          | The real time                                                           |
| `fixedClock(time)`     | An in-memory `ChangeableClock` starting at `time`                       |
| `StoredClock`          | A `ChangeableClock` backed by a `ClockStorage`                          |
| `ClockStorage`         | `load(): Promise<string \| undefined>` and `save(value): Promise<void>` |
| `InMemoryClockStorage` | Keeps the value in memory                                               |
| `FileClockStorage`     | Keeps the value in a file (`@bloom-group/clock/file`)                   |
| `DEFAULT_STORED_TIME`  | Where a `StoredClock` starts when nothing is stored                     |

## License

MIT
