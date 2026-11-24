import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ClockStorage } from './clock-storage.js';

export class FileClockStorage implements ClockStorage {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

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
    // Write to a temporary file and rename it so readers never see a partial write.
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, value, 'utf8');
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
