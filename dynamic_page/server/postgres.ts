import pg from 'pg';
import type { Store, TestResult } from './db.js';

// The `pg` package is CommonJS, so Pool comes off the default import.
const { Pool } = pg;

// Postgres needs the table to exist before we can use it. Creating it when the
// server starts means there is no separate migration step to run.
const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS results (
    id            BIGSERIAL PRIMARY KEY,
    wpm           INTEGER     NOT NULL,
    correct_chars INTEGER     NOT NULL,
    errors        INTEGER     NOT NULL,
    accuracy      REAL        NOT NULL,
    duration_sec  INTEGER     NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS results_created_at_idx ON results (created_at DESC);
`;

// Postgres columns are named with underscores, the rest of the app uses
// camelCase, so this converts one row from the database into a TestResult.
function rowToResult(row: any): TestResult {
  return {
    wpm: row.wpm,
    correctChars: row.correct_chars,
    errors: row.errors,
    accuracy: row.accuracy,
    durationSec: row.duration_sec,
    createdAt: row.created_at,
  };
}

/**
 * Connects to Postgres. Returns null if DATABASE_URL is not set or the
 * connection fails, because a missing database should not stop the server
 * from starting.
 */
export async function connectPostgres(): Promise<Store | null> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('DATABASE_URL is not set, skipping Postgres.');
    return null;
  }

  // A Postgres running on your own machine has no TLS, while hosted ones
  // (Neon, Supabase, Railway) require it, so pick based on the address.
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

  try {
    const pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    await pool.query(CREATE_TABLE);

    console.log('Connected to Postgres (public.results)');

    return {
      id: 'postgres',
      label: 'Postgres',

      async insert(result) {
        await pool.query(
          `INSERT INTO results (wpm, correct_chars, errors, accuracy, duration_sec, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            result.wpm,
            result.correctChars,
            result.errors,
            result.accuracy,
            result.durationSec,
            result.createdAt,
          ],
        );
      },

      async recent(limit) {
        const { rows } = await pool.query(
          `SELECT wpm, correct_chars, errors, accuracy, duration_sec, created_at
           FROM results
           ORDER BY created_at DESC
           LIMIT $1`,
          [limit],
        );

        // SQL gives us newest first, so flip it to match the other stores.
        return rows.reverse().map(rowToResult);
      },
    };
  } catch (error) {
    console.error('Could not connect to Postgres:', error);
    return null;
  }
}
