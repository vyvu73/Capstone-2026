import { MemoryStore } from './memoryStore.js';
import { createMongoStore } from './mongoStore.js';
import { createPostgresStore } from './postgresStore.js';
import type { ResultStore, StoreId, TestResult } from './types.js';

export type { ResultStore, StoreId, TestResult } from './types.js';

export type WriteOutcome = 'ok' | 'error';

export interface WriteReport {
  store: StoreId;
  outcome: WriteOutcome;
  error?: string;
}

export interface SourceInfo {
  id: StoreId;
  label: string;
}

/**
 * Holds every configured database and writes to all of them at once. Reads come
 * from whichever one the caller names, so the same run can be read back out of
 * Postgres or out of Mongo and compared.
 */
export class StoreRegistry {
  constructor(private readonly stores: ResultStore[]) {}

  get sources(): SourceInfo[] {
    return this.stores.map((store) => ({ id: store.id, label: store.label }));
  }

  has(id: StoreId): boolean {
    return this.stores.some((store) => store.id === id);
  }

  /** The source used when the client does not name one. */
  get defaultSource(): StoreId {
    return this.stores[0].id;
  }

  /**
   * Fan the write out to every store in parallel and report each one
   * separately. `allSettled`, not `all`: one database being down must not lose
   * the write to the other, and must not fail the request.
   */
  async insertEverywhere(result: TestResult): Promise<WriteReport[]> {
    const settled = await Promise.allSettled(this.stores.map((store) => store.insert(result)));

    return settled.map((outcome, i) => {
      const store = this.stores[i].id;
      if (outcome.status === 'fulfilled') return { store, outcome: 'ok' };

      const error = (outcome.reason as Error).message;
      console.error(`[stores] Write to ${store} failed:`, error);
      return { store, outcome: 'error', error };
    });
  }

  /**
   * `async` on purpose: a bad source name must reject the returned promise
   * rather than throw synchronously, or a caller using `.catch()` instead of
   * `try/await` would take an uncaught exception.
   */
  async recentFrom(id: StoreId, limit: number): Promise<TestResult[]> {
    const store = this.stores.find((candidate) => candidate.id === id);
    if (!store) throw new Error(`Unknown source: ${id}`);
    return store.recent(limit);
  }
}

/**
 * Opens whichever databases are configured. Both are optional and independent:
 * with only one configured the app runs on that one, and with neither it falls
 * back to memory so a fresh clone still works.
 */
export async function createRegistry(): Promise<StoreRegistry> {
  // Opened in parallel -- two sequential connection timeouts would mean a
  // 16-second boot on a bad network.
  const [mongo, postgres] = await Promise.all([createMongoStore(), createPostgresStore()]);

  const stores = [mongo, postgres].filter((store): store is ResultStore => store !== null);

  if (stores.length === 0) {
    console.warn(
      '\n[stores] Neither database is configured -- falling back to an in-memory store.\n' +
        '[stores] The app works, but every result is lost when this server restarts.\n' +
        '[stores] Copy .env.example to .env and fill in MONGODB_URI and/or DATABASE_URL.\n',
    );
    return new StoreRegistry([new MemoryStore()]);
  }

  console.log(`[stores] Active: ${stores.map((store) => store.label).join(', ')}`);
  return new StoreRegistry(stores);
}
