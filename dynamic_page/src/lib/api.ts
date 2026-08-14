import type {
  HealthResponse,
  QuotesResponse,
  ResultsResponse,
  SaveResponse,
  StoreId,
  TestResult,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status}`);
  return (await response.json()) as T;
}

/** Which databases the server has open. Drives the read-source toggle. */
export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health');
}

export function fetchQuotes(): Promise<QuotesResponse> {
  return request<QuotesResponse>('/api/quotes');
}

export function fetchResults(source: StoreId | null, limit = 10): Promise<ResultsResponse> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (source) query.set('source', source);
  return request<ResultsResponse>(`/api/results?${query}`);
}

export type NewResult = Pick<TestResult, 'correctChars' | 'errors' | 'durationSec'>;

/** One POST; the server fans it out to every configured database. */
export function saveResult(result: NewResult): Promise<SaveResponse> {
  return request<SaveResponse>('/api/results', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}
