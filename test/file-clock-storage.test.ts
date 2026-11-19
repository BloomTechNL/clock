import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Temporal } from 'temporal-polyfill';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileClockStorage } from '../src/file.js';
import { StoredClock } from '../src/index.js';

const NOON = Temporal.Instant.from('2026-01-01T12:00:00Z');

describe('FileClockStorage', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'clock-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('loads nothing when the file does not exist', async () => {
    const storage = new FileClockStorage(join(directory, 'clock.txt'));

    expect(await storage.load()).toBeUndefined();
  });

  it('saves the value to the file, creating missing directories', async () => {
    const filePath = join(directory, 'nested', 'clock.txt');

    await new FileClockStorage(filePath).save('2026-01-01T12:00:00Z');

    expect(await readFile(filePath, 'utf8')).toBe('2026-01-01T12:00:00Z');
  });

  it('shares the time between clocks using the same file', async () => {
    const filePath = join(directory, 'clock.txt');
    await new StoredClock(new FileClockStorage(filePath)).changeTime(NOON);

    const otherClock = new StoredClock(new FileClockStorage(filePath));

    expect((await otherClock.now()).equals(NOON)).toBe(true);
  });

  it('ignores surrounding whitespace, such as a trailing newline from an editor', async () => {
    const filePath = join(directory, 'clock.txt');
    await new FileClockStorage(filePath).save('2026-01-01T12:00:00Z\n');

    expect(await new FileClockStorage(filePath).load()).toBe('2026-01-01T12:00:00Z');
  });

  it('passes on errors other than a missing file', async () => {
    const storage = new FileClockStorage(directory);

    await expect(storage.load()).rejects.toThrow();
  });
});
