import { FALLBACK_QUOTES } from './fallbackQuotes.js';

const ZENQUOTES_URL = 'https://zenquotes.io/api/quotes';

// How long we trust our cached quotes before fetching new ones (5 minutes).
const CACHE_TTL_MS = 5 * 60 * 1000;

export type QuoteSource = 'zenquotes' | 'fallback';

export interface QuotesResult {
  quotes: string[];
  source: QuoteSource;
}

// Simple in-memory cache. Starts empty.
let cachedQuotes: string[] | null = null;
let cachedSource: QuoteSource | null = null;
let cachedAt = 0;

/**
 * Quotes from the internet often contain "fancy" characters (curly quotes,
 * em dashes, etc.) that you can't type on a normal keyboard. This function
 * replaces them with plain, typeable versions.
 */
function toTypeableAscii(text: string): string {
  return text
    .replace(/[‘’]/g, "'") // curly single quotes -> straight quote
    .replace(/[“”]/g, '"') // curly double quotes -> straight quote
    .replace(/[–—]/g, '-') // en/em dash -> hyphen
    .replace(/…/g, '...') // ellipsis character -> three dots
    .replace(/[^ -~]/g, '') // drop anything else a keyboard can't produce
    .replace(/\s+/g, ' ') // collapse extra whitespace
    .trim();
}

// Only keep quotes that are a reasonable length to type.
function isUsable(quote: string): boolean {
  return quote.length >= 20 && quote.length <= 220;
}

/**
 * Calls the ZenQuotes API and returns a cleaned-up list of quote strings.
 * Throws an error if the request fails or the response looks bad.
 */
async function fetchFromZenQuotes(): Promise<string[]> {
  const response = await fetch(ZENQUOTES_URL);

  if (!response.ok) {
    throw new Error(`ZenQuotes responded with status ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Unexpected response shape from ZenQuotes');
  }

  const quotes = data
    .map((entry) => (typeof entry.q === 'string' ? toTypeableAscii(entry.q) : ''))
    .filter(isUsable);

  // ZenQuotes answers a rate-limited request with a single-item array, so a
  // very short list means we got an error message rather than real quotes.
  if (quotes.length < 5) {
    throw new Error('Not enough usable quotes in the response');
  }

  return quotes;
}

/**
 * Returns a list of quotes, using the cache if it's still fresh,
 * fetching from ZenQuotes if not, and falling back to local quotes
 * if the fetch fails.
 */
export async function getQuotes(): Promise<QuotesResult> {
  const cacheIsFresh = cachedQuotes && Date.now() - cachedAt < CACHE_TTL_MS;

  if (cacheIsFresh) {
    return { quotes: cachedQuotes!, source: cachedSource! };
  }

  try {
    const quotes = await fetchFromZenQuotes();
    cachedQuotes = quotes;
    cachedSource = 'zenquotes';
    cachedAt = Date.now();
    return { quotes, source: 'zenquotes' };
  } catch (error) {
    console.warn('ZenQuotes fetch failed, using fallback quotes:', error);

    const quotes = FALLBACK_QUOTES.map(toTypeableAscii);
    cachedQuotes = quotes;
    cachedSource = 'fallback';
    cachedAt = Date.now();
    return { quotes, source: 'fallback' };
  }
}
