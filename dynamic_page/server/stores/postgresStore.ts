import pg from 'pg';
import type { ResultStore, TestResult } from './types.js';

// `pg` is CommonJS, so the named exports come off the default import.
const { Pool } = pg;

/**
 * Postgres wants a schema up front, unlike Mongo. Creating it on boot keeps the
 * project a single `npm run dev` away from working, with no migration step.
 */
const SCHEMA = `
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

interface ResultRow {
  wpm: number;
  correct_chars: number;
  errors: number;
  accuracy: number;
  duration_sec: number;
  created_at: Date;
}

/** Postgres columns are snake_case; the rest of the app speaks camelCase. */
function toResult(row: ResultRow): TestResult {
  return {
    wpm: row.wpm,
    correctChars: row.correct_chars,
    errors: row.errors,
    accuracy: row.accuracy,
    durationSec: row.duration_sec,
    createdAt: row.created_at,
  };
}

class PostgresStore implements ResultStore {
  readonly id = 'postgres' as const;
  readonly label = 'Postgres';
  readonly connected = true;

  constructor(private readonly pool: pg.Pool) {}

  async insert(result: TestResult): Promise<void> {
    await this.pool.query(
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
  }

  async recent(limit: number): Promise<TestResult[]> {
    const { rows } = await this.pool.query<ResultRow>(
      `SELECT wpm, correct_chars, errors, accuracy, duration_sec, created_at
       FROM results
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    // Newest-first out of SQL, reversed so callers always get oldest-first.
    return rows.reverse().map(toResult);
  }
}

/**
 * Connects to Postgres. Returns null when DATABASE_URL is unset or the
 * connection fails -- a missing database must never stop the server booting.
 */
export async function createPostgresStore(): Promise<ResultStore | null> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.warn('[postgres] DATABASE_URL is not set -- Postgres writes will be skipped.');
    return null;
  }

  // Hosted Postgres (Neon, Supabase, Railway, Heroku) requires TLS but serves
  // a certificate that is not in Node's trust store; local Postgres has no TLS
  // at all. This picks the right behaviour from the host in the URL.
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);

  try {
    const pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });

    await pool.query('SELECT 1');
    await pool.query(SCHEMA);

    console.log('[postgres] Connected and schema ready -> public.results');
    return new PostgresStore(pool);
  } catch (error) {
    console.error('[postgres] Connection failed:', (error as Error).message);
    return null;
  }
}
