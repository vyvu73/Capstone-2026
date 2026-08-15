import type { SourceInfo, StoreId, TestResult } from '../lib/api';

interface Props {
  results: TestResult[];
  loading: boolean;
  sources: SourceInfo[];
  activeSource: StoreId | null;
  onChooseSource: (source: StoreId) => void;
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// The list of past runs: when you took the test, and how fast you were.
export function HistoryList({ results, loading, sources, activeSource, onChooseSource }: Props) {
  // The server sends oldest first, but the newest run is the interesting one.
  const newestFirst = [...results].reverse();
  const usingMemory = sources.some((source) => source.id === 'memory');

  return (
    <section className="rounded-2xl border border-clay-faint/70 bg-paper-raised p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl leading-none tracking-[-0.02em] text-ink">Past runs</h2>

        {/* One button per connected database. The same runs should show up
            under each one, because every run is saved to all of them. */}
        {sources.length > 1 && (
          <div
            className="flex gap-1 rounded-full border border-clay-faint/70 bg-paper p-1"
            role="group"
            aria-label="Read past runs from"
          >
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onChooseSource(source.id)}
                aria-pressed={source.id === activeSource}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                  source.id === activeSource
                    ? 'bg-ember text-paper-raised'
                    : 'text-clay hover:text-ink active:text-ink'
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>
        )}

        {sources.length === 1 && <span className="text-xs text-clay">from {sources[0].label}</span>}
      </div>

      {loading && <p className="mt-5 text-sm text-clay">Loading...</p>}

      {!loading && newestFirst.length === 0 && (
        <p className="mt-5 text-sm leading-[1.7] text-clay">
          Nothing yet. Finish a test and it shows up here.
        </p>
      )}

      {!loading && newestFirst.length > 0 && (
        <ul className="mt-5">
          <li className="flex items-baseline justify-between gap-4 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-clay">
            <span>Time</span>
            <span>WPM</span>
          </li>
          {newestFirst.map((result, i) => (
            <li
              key={`${result.createdAt}-${i}`}
              className="flex items-baseline justify-between gap-4 border-t border-clay-faint/60 py-3"
            >
              <span className="text-sm text-ink-soft">{formatTime(result.createdAt)}</span>
              <span className="font-display text-xl leading-none tabular-nums text-ink">
                {result.wpm}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && usingMemory && (
        <p className="mt-5 text-xs leading-relaxed text-clay">
          No database configured, so these are held in memory only. Set <code>MONGODB_URI</code>{' '}
          and/or <code>DATABASE_URL</code> to keep this list.
        </p>
      )}
    </section>
  );
}
