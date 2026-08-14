import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import { createRegistry } from './stores/index.js';
import type { StoreId, TestResult } from './stores/index.js';
import { getQuotes } from './quotes.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json({ limit: '16kb' }));

const registry = await createRegistry();

/** Which databases are live, so the client can offer them as read sources. */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ sources: registry.sources, defaultSource: registry.defaultSource });
});

/** Passage source. Proxied because zenquotes.io sends no CORS headers. */
app.get('/api/quotes', async (_req: Request, res: Response) => {
  const { quotes, source } = await getQuotes();
  res.json({ quotes, source });
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Save one finished test -- to every configured database at once. */
app.post('/api/results', async (req: Request, res: Response) => {
  const body = req.body as Partial<TestResult>;

  if (
    !isFiniteNumber(body.correctChars) ||
    !isFiniteNumber(body.errors) ||
    body.correctChars < 0 ||
    body.errors < 0
  ) {
    res.status(400).json({ error: 'correctChars and errors must be non-negative numbers' });
    return;
  }

  const durationSec = isFiniteNumber(body.durationSec) && body.durationSec > 0 ? body.durationSec : 60;
  const totalKeystrokes = body.correctChars + body.errors;

  // Derived here, once, from the raw counts rather than trusting the client --
  // and critically, built once so every database stores an identical row.
  const result: TestResult = {
    correctChars: Math.round(body.correctChars),
    errors: Math.round(body.errors),
    wpm: Math.round(body.correctChars / 5 / (durationSec / 60)),
    accuracy: totalKeystrokes === 0 ? 0 : body.correctChars / totalKeystrokes,
    durationSec,
    createdAt: new Date(),
  };

  const writes = await registry.insertEverywhere(result);

  // A partial write still succeeded somewhere, so this is not a 500. The report
  // tells the client exactly which databases took it.
  if (writes.every((write) => write.outcome === 'error')) {
    res.status(500).json({ error: 'Every database rejected the write', writes });
    return;
  }

  res.status(201).json({ result, writes });
});

/** History for the list, oldest first, read from whichever database is asked for. */
app.get('/api/results', async (req: Request, res: Response) => {
  const requested = Number(req.query.limit);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20;

  const asked = typeof req.query.source === 'string' ? (req.query.source as StoreId) : null;
  const source = asked && registry.has(asked) ? asked : registry.defaultSource;

  try {
    res.json({ results: await registry.recentFrom(source, limit), source });
  } catch (error) {
    console.error(`[api] Failed to read results from ${source}:`, (error as Error).message);
    res.status(500).json({ error: `Could not load results from ${source}` });
  }
});

app.listen(port, () => {
  console.log(`[api] Listening on http://localhost:${port}`);
});
