export interface ClockStorage {
  load(): Promise<string | undefined>;
  save(value: string): Promise<void>;
}

export class InMemoryClockStorage implements ClockStorage {
  private value: string | undefined;

  async load(): Promise<string | undefined> {
    return this.value;
  }

  async save(value: string): Promise<void> {
    this.value = value;
  }
}
