import { connectMongo } from './mongo.js';
import { connectPostgres } from './postgres.js';

// One finished typing test. There are no user accounts, so nothing here
// identifies who took it.
export interface TestResult {
  wpm: number;
  correctChars: number;
  errors: number;
  accuracy: number; // 0 to 1
  durationSec: number;
  createdAt: Date;
}

export type StoreId = 'mongo' | 'postgres' | 'memory';

// Every database looks like this to the rest of the server, so the routes
// never have to care whether they are talking to Mongo or to Postgres.
export interface Store {
  id: StoreId;
  label: string;
  insert(result: TestResult): Promise<void>;
  recent(limit: number): Promise<TestResult[]>; // oldest first
}

// Used when no database is configured at all, so the app still runs.
// Everything is lost when the server restarts.
function createMemoryStore(): Store {
  const saved: TestResult[] = [];

  return {
    id: 'memory',
    label: 'In memory',
    async insert(result) {
      saved.push(result);
    },
    async recent(limit) {
      return saved.slice(-limit);
    },
  };
}

// Filled in by connectDatabases() when the server starts.
let stores: Store[] = [];

export async function connectDatabases(): Promise<void> {
  const mongo = await connectMongo();
  const postgres = await connectPostgres();

  stores = [mongo, postgres].filter((store) => store !== null);

  if (stores.length === 0) {
    console.log('No database configured, results will be kept in memory only.');
    stores = [createMemoryStore()];
  }
}

// The databases the client is allowed to read from.
export function getSources() {
  return stores.map((store) => ({ id: store.id, label: store.label }));
}

export function getDefaultSource(): StoreId {
  return stores[0].id;
}

/**
 * Saves one result to every database that connected. If one database is down
 * we still want the other to get the result, so a failure is logged rather
 * than thrown. Returns true when at least one database took it.
 */
export async function saveResult(result: TestResult): Promise<boolean> {
  let savedSomewhere = false;

  for (const store of stores) {
    try {
      await store.insert(result);
      savedSomewhere = true;
    } catch (error) {
      console.error(`Could not save to ${store.label}:`, error);
    }
  }

  return savedSomewhere;
}

// Reads past runs from one database. An unknown name falls back to the first
// one, so a stale request from the browser can never break the page.
export function getRecentResults(source: StoreId, limit: number): Promise<TestResult[]> {
  const store = stores.find((candidate) => candidate.id === source) ?? stores[0];
  return store.recent(limit);
}
