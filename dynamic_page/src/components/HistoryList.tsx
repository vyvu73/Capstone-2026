import type { SourceInfo, StoreId, TestResult } from '../lib/types';

interface Props {
  results: TestResult[];
  loading: boolean;
  sources: SourceInfo[];
  activeSource: StoreId | null;
  onSelectSource: (source: StoreId) => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Past runs, newest first: when you took it, and how fast you were. */
export function HistoryList({ results, loading, sources, activeSource, onSelectSource }: Props) {
  const newestFirst = [...results].reverse();
  const usingMemory = sources.some((source) => source.id === 'memory');

  return (
    <section className="rounded-2xl border border-clay-faint/70 bg-paper-raised p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl leading-none tracking-[-0.02em] text-ink">Past runs</h2>

        {/* One button per live database. The same rows should appear under each. */}
        {sources.length > 1 && (
          <div
            className="flex gap-1 rounded-full border border-clay-faint/70 bg-paper p-1"
            role="group"
            aria-label="Read history from"
          >
            {sources.map((source) => {
              const selected = source.id === activeSource;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => onSelectSource(source.id)}
                  aria-pressed={selected}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-transform duration-200 ease-spring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:scale-[0.97] ${
                    selected
                      ? 'bg-ember text-paper-raised'
                      : 'text-clay hover:text-ink'
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        )}

        {sources.length === 1 && (
          <span className="text-xs text-clay">from {sources[0].label}</span>
        )}
      </div>

      {loading && <p className="mt-5 text-sm text-clay">Loading…</p>}

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

      {usingMemory && !loading && (
        <p className="mt-5 text-xs leading-relaxed text-clay">
          No database configured — held in memory only. Set <code>MONGODB_URI</code> and/or{' '}
          <code>DATABASE_URL</code> to keep this list.
        </p>
      )}
    </section>
  );
}
