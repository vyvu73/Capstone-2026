import 'dotenv/config';
import express from 'express';
import {
  connectDatabases,
  getDefaultSource,
  getRecentResults,
  getSources,
  saveResult,
} from './db.js';
import type { StoreId, TestResult } from './db.js';
import { getQuotes } from './quotes.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json());

await connectDatabases();

// Tells the browser which databases are connected, so it can offer them in
// the "past runs" list.
app.get('/api/health', (_req, res) => {
  res.json({ sources: getSources(), defaultSource: getDefaultSource() });
});

// The quotes we build the typing passage from. We fetch them here on the
// server because zenquotes.io does not allow requests straight from a browser.
app.get('/api/quotes', async (_req, res) => {
  res.json(await getQuotes());
});

// Saves one finished test.
app.post('/api/results', async (req, res) => {
  const body = req.body ?? {};
  const correctChars = Math.round(Number(body.correctChars));
  const errors = Math.round(Number(body.errors));
  const durationSec = Number(body.durationSec) || 60;

  if (!Number.isFinite(correctChars) || correctChars < 0) {
    res.status(400).json({ error: 'correctChars must be a number of 0 or more' });
    return;
  }

  if (!Number.isFinite(errors) || errors < 0) {
    res.status(400).json({ error: 'errors must be a number of 0 or more' });
    return;
  }

  const totalKeystrokes = correctChars + errors;

  // We work out the score here rather than trusting the numbers the browser
  // sends, and we build the result once so every database stores the same row.
  const result: TestResult = {
    correctChars,
    errors,
    wpm: Math.round(correctChars / 5 / (durationSec / 60)),
    accuracy: totalKeystrokes === 0 ? 0 : correctChars / totalKeystrokes,
    durationSec,
    createdAt: new Date(),
  };

  const saved = await saveResult(result);

  if (!saved) {
    res.status(500).json({ error: 'Every database refused the result' });
    return;
  }

  res.status(201).json({ result });
});

// The list of past runs, oldest first.
app.get('/api/results', async (req, res) => {
  // Cap the limit so nobody can ask for the whole table at once.
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const source = req.query.source as StoreId;

  try {
    res.json({ results: await getRecentResults(source, limit) });
  } catch (error) {
    console.error('Could not read past runs:', error);
    res.status(500).json({ error: 'Could not load past runs' });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
