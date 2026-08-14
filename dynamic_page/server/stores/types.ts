/** One finished 60-second test. Anonymous -- no user identity is stored. */
export interface TestResult {
  wpm: number;
  correctChars: number;
  errors: number;
  /** 0..1 */
  accuracy: number;
  durationSec: number;
  createdAt: Date;
}

export type StoreId = 'mongo' | 'postgres' | 'memory';

/**
 * The contract both databases implement. Everything above this line is storage
 * agnostic: the route handlers never learn whether they are talking to a
 * document store or a relational one, which is what makes running both at once
 * cost almost nothing.
 */
export interface ResultStore {
  readonly id: StoreId;
  readonly label: string;
  /** False when the connection was never configured or failed to open. */
  readonly connected: boolean;
  insert(result: TestResult): Promise<void>;
  /** Most recent `limit` results, returned OLDEST FIRST. */
  recent(limit: number): Promise<TestResult[]>;
}
