import type { ResultStore, TestResult } from './types.js';

/**
 * Last-resort store, used only when neither real database is configured. It
 * keeps the app fully usable on a fresh clone, at the cost of losing everything
 * when the process restarts.
 */
export class MemoryStore implements ResultStore {
  readonly id = 'memory' as const;
  readonly label = 'In memory';
  readonly connected = true;

  private readonly results: TestResult[] = [];

  async insert(result: TestResult): Promise<void> {
    this.results.push(result);
  }

  async recent(limit: number): Promise<TestResult[]> {
    return this.results.slice(-limit);
  }
}
