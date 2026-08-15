// One finished typing test, the way the server sends it back to us.
export interface TestResult {
  wpm: number;
  correctChars: number;
  errors: number;
  accuracy: number; // 0 to 1
  durationSec: number;
  createdAt: string; // an ISO date string, e.g. "2026-08-15T10:30:00.000Z"
}

// Which database a row came from.
export type StoreId = 'mongo' | 'postgres' | 'memory';

export interface SourceInfo {
  id: StoreId;
  label: string;
}

// Every GET request goes through here so we only write the error check once.
async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GET ${url} failed with status ${response.status}`);
  }

  return response.json();
}

// Which databases the server managed to connect to.
export function fetchHealth() {
  return get<{ sources: SourceInfo[]; defaultSource: StoreId }>('/api/health');
}

export function fetchQuotes() {
  return get<{ quotes: string[] }>('/api/quotes');
}

export function fetchResults(source: StoreId | null, limit = 10) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (source) query.set('source', source);

  return get<{ results: TestResult[] }>(`/api/results?${query}`);
}

// The server works out the WPM and accuracy itself, so we only send the counts.
export async function saveResult(correctChars: number, errors: number, durationSec: number) {
  const response = await fetch('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correctChars, errors, durationSec }),
  });

  if (!response.ok) {
    throw new Error(`Saving the result failed with status ${response.status}`);
  }
}
