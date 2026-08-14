/** One finished 60-second test, as stored in each database. Anonymous. */
export interface TestResult {
  wpm: number;
  correctChars: number;
  errors: number;
  /** 0..1 */
  accuracy: number;
  durationSec: number;
  /** ISO string once it has round-tripped through JSON. */
  createdAt: string;
}

export type QuoteSource = 'zenquotes' | 'fallback';

export interface QuotesResponse {
  quotes: string[];
  source: QuoteSource;
}

/** Which database a read came from, or a write went to. */
export type StoreId = 'mongo' | 'postgres' | 'memory';

export interface SourceInfo {
  id: StoreId;
  label: string;
}

export interface HealthResponse {
  sources: SourceInfo[];
  defaultSource: StoreId;
}

export interface ResultsResponse {
  results: TestResult[];
  source: StoreId;
}

export interface WriteReport {
  store: StoreId;
  outcome: 'ok' | 'error';
  error?: string;
}

export interface SaveResponse {
  result: TestResult;
  writes: WriteReport[];
}

/** How a single character of the passage should be painted. */
export type CharState = 'done' | 'active' | 'error' | 'pending';
