import { MongoClient } from 'mongodb';
import type { Collection } from 'mongodb';
import type { ResultStore, TestResult } from './types.js';

class MongoStore implements ResultStore {
  readonly id = 'mongo' as const;
  readonly label = 'MongoDB Atlas';
  readonly connected = true;

  constructor(private readonly collection: Collection<TestResult>) {}

  async insert(result: TestResult): Promise<void> {
    // Spread so Mongo's driver cannot decorate the caller's object with _id --
    // the same object is handed to Postgres straight afterwards.
    await this.collection.insertOne({ ...result });
  }

  async recent(limit: number): Promise<TestResult[]> {
    const docs = await this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    // Newest-first out of Mongo, reversed so callers always get oldest-first.
    return docs.reverse() as TestResult[];
  }
}

/**
 * Connects to MongoDB Atlas. Returns null when MONGODB_URI is unset or the
 * connection fails -- a missing database must never stop the server booting.
 */
export async function createMongoStore(): Promise<ResultStore | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.warn('[mongo] MONGODB_URI is not set -- Mongo writes will be skipped.');
    return null;
  }

  const dbName = process.env.MONGODB_DB || 'typing_speed_test';
  const collectionName = process.env.MONGODB_COLLECTION || 'results';

  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    await client.db(dbName).command({ ping: 1 });

    const collection = client.db(dbName).collection<TestResult>(collectionName);
    // The history query always sorts by createdAt, so index it.
    await collection.createIndex({ createdAt: -1 });

    console.log(`[mongo] Connected to Atlas -> ${dbName}.${collectionName}`);
    return new MongoStore(collection);
  } catch (error) {
    console.error('[mongo] Connection failed:', (error as Error).message);
    return null;
  }
}
