import { MongoClient } from 'mongodb';
import type { Store, TestResult } from './db.js';

/**
 * Connects to MongoDB. Returns null if MONGODB_URI is not set or the
 * connection fails, because a missing database should not stop the server
 * from starting.
 */
export async function connectMongo(): Promise<Store | null> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('MONGODB_URI is not set, skipping MongoDB.');
    return null;
  }

  const dbName = process.env.MONGODB_DB || 'typing_speed_test';
  const collectionName = process.env.MONGODB_COLLECTION || 'results';

  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();

    const collection = client.db(dbName).collection<TestResult>(collectionName);
    // The past-runs query always sorts by createdAt, so give it an index.
    await collection.createIndex({ createdAt: -1 });

    console.log(`Connected to MongoDB (${dbName}.${collectionName})`);

    return {
      id: 'mongo',
      label: 'MongoDB',

      async insert(result) {
        // Save a copy, because the Mongo driver adds an _id to whatever object
        // you hand it and we pass the same object to Postgres next.
        await collection.insertOne({ ...result });
      },

      async recent(limit) {
        const docs = await collection
          .find({}, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();

        // Mongo gives us newest first, so flip it to match the other stores.
        return docs.reverse() as TestResult[];
      },
    };
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    return null;
  }
}
