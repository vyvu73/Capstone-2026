import { FALLBACK_QUOTES } from './fallbackQuotes.js';

const ZENQUOTES_URL = 'https://zenquotes.io/api/quotes';

/**
 * zenquotes.io allows roughly 5 requests per 30 seconds per IP. We fetch once
 * and serve every browser from this cache so a room full of users cannot trip
 * that limit.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

export type QuoteSource = 'zenquotes' | 'fallback';

let cache: { quotes: string[]; source: QuoteSource; fetchedAt: number } | null = null;
let inFlight: Promise<string[]> | null = null;

interface ZenQuote {
  q?: unknown;
  a?: unknown;
}

/**
 * Curly quotes, em dashes and exotic spaces cannot be produced by a plain
 * keypress, so a passage containing them would be impossible to type. Fold them
 * down to ASCII and drop anything else outside the printable range.
 */
function toTypeableAscii(text: string): string {
  return (
    text
      .replace(/[‘’‛′]/g, "'")
      .replace(/[“”‟″]/g, '"')
      .replace(/[‐-―−]/g, '-')
      .replace(/…/g, '...')
      // Exotic spaces must become real spaces *before* the ASCII filter below,
      // otherwise they are deleted outright and two words fuse together.
      .replace(/[  -   　]/g, ' ')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function isUsable(quote: string): boolean {
  return quote.length >= 20 && quote.length <= 220;
}

async function fetchFromZenQuotes(): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(ZENQUOTES_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`zenquotes responded ${response.status}`);

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('zenquotes did not return an array');

    const quotes = (payload as ZenQuote[])
      .map((entry) => (typeof entry.q === 'string' ? toTypeableAscii(entry.q) : ''))
      .filter(isUsable);

    // zenquotes reports rate limiting as a single-element array, so a thin
    // response is a failure -- serving it would mean a one-line passage.
    if (quotes.length < 5) throw new Error('zenquotes returned too few usable quotes');

    return quotes;
  } finally {
    clearTimeout(timeout);
  }
}

export interface QuotesResult {
  quotes: string[];
  source: QuoteSource;
}

export async function getQuotes(): Promise<QuotesResult> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { quotes: cache.quotes, source: cache.source };
  }

  // Collapse concurrent cache misses into a single upstream request.
  if (!inFlight) {
    inFlight = fetchFromZenQuotes().finally(() => {
      inFlight = null;
    });
  }

  try {
    const quotes = await inFlight;
    cache = { quotes, source: 'zenquotes', fetchedAt: Date.now() };
    return { quotes, source: 'zenquotes' };
  } catch (error) {
    console.warn(
      '[quotes] zenquotes.io unavailable, serving fallback quotes:',
      (error as Error).message,
    );
    const quotes = FALLBACK_QUOTES.map(toTypeableAscii);
    // Cache the fallback too, so a sustained outage does not mean a failed
    // upstream call on every single page load.
    cache = { quotes, source: 'fallback', fetchedAt: Date.now() };
    return { quotes, source: 'fallback' };
  }
}
