import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ClockStorage } from './clock-storage.js';

export class FileClockStorage implements ClockStorage {
  constructor(private readonly filePath: string) {}

  async load(): Promise<string | undefined> {
    try {
      return (await readFile(this.filePath, 'utf8')).trim();
    } catch (error) {
      if (isFileNotFound(error)) return undefined;
      throw error;
    }
  }

  async save(value: string): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, value, 'utf8');
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
