import type { KeyValueStorage } from "../guestStore";

/** In-memory `KeyValueStorage` for tests. Set `failWith` to make writes throw. */
export class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  failWith: Error | null = null;
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWith) throw this.failWith;
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
