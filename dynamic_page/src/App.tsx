import { useCallback, useEffect, useRef, useState } from 'react';
import { HistoryList } from './components/HistoryList';
import { Passage } from './components/Passage';
import { ResultModal } from './components/ResultModal';
import { ScoreBox } from './components/ScoreBox';
import { TimerBox } from './components/TimerBox';
import { useCountdown } from './hooks/useCountdown';
import { useTypingEngine } from './hooks/useTypingEngine';
import { fetchHealth, fetchQuotes, fetchResults, saveResult } from './lib/api';
import type { SourceInfo, StoreId, TestResult } from './lib/types';

const DURATION_SEC = 60;

const PRIMARY_BUTTON =
  'rounded-full bg-ember px-6 py-3 text-sm font-semibold text-paper-raised transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-deep active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

const SECONDARY_BUTTON =
  'rounded-full border border-clay-faint bg-paper-raised px-6 py-3 text-sm font-semibold text-ink-soft transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:translate-y-0 active:scale-[0.98]';

export default function App() {
  const [quotes, setQuotes] = useState<readonly string[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  const [results, setResults] = useState<TestResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Which databases the server has open, and which one we are reading from.
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [source, setSource] = useState<StoreId | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [finalScore, setFinalScore] = useState({ correctChars: 0, errors: 0 });

  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async (from: StoreId | null) => {
    try {
      const { results: rows } = await fetchResults(from);
      setResults(rows);
    } catch (error) {
      console.error('Could not load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /** Switch which database the list is read from, and reload it. */
  const handleSelectSource = useCallback(
    (next: StoreId) => {
      setSource(next);
      setHistoryLoading(true);
      void loadHistory(next);
    },
    [loadHistory],
  );

  useEffect(() => {
    let cancelled = false;

    fetchQuotes()
      .then(({ quotes: fetched }) => {
        if (!cancelled) setQuotes(fetched);
      })
      .catch((error) => {
        console.error('Could not load quotes:', error);
      })
      .finally(() => {
        if (!cancelled) setQuotesLoading(false);
      });

    // Ask which databases are live before reading, so the toggle only ever
    // offers a source the server can actually serve.
    fetchHealth()
      .then(async ({ sources: live, defaultSource }) => {
        if (cancelled) return;
        setSources(live);
        setSource(defaultSource);
        await loadHistory(defaultSource);
      })
      .catch(async (error) => {
        console.error('Could not read server health:', error);
        if (!cancelled) await loadHistory(null);
      });

    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  // Read through refs so the countdown's completion handler always sees the
  // current values without having to be rebuilt on every keystroke.
  const scoreRef = useRef({ correctChars: 0, errors: 0 });
  const sourceRef = useRef<StoreId | null>(null);
  sourceRef.current = source;

  const handleComplete = useCallback(async () => {
    const { correctChars, errors } = scoreRef.current;
    setFinalScore({ correctChars, errors });
    setModalOpen(true);
    inputRef.current?.blur();

    // A run where nobody typed is not a score. Show the result, but keep the
    // zero out of the history list.
    if (correctChars === 0) {
      setSaveState('idle');
      return;
    }

    setSaveState('saving');

    try {
      // One request; the server writes it to every configured database.
      await saveResult({ correctChars, errors, durationSec: DURATION_SEC });
      setSaveState('saved');
      await loadHistory(sourceRef.current);
    } catch (error) {
      console.error('Could not save result:', error);
      setSaveState('failed');
    }
  }, [loadHistory]);

  const { remaining, running, paused, start, pause, resume, reset: resetClock } = useCountdown({
    durationSec: DURATION_SEC,
    onComplete: handleComplete,
  });

  const active = running && !paused;
  const engine = useTypingEngine({ quotes, active });
  scoreRef.current = { correctChars: engine.correctChars, errors: engine.errors };

  const handleStart = useCallback(() => {
    engine.reset();
    setSaveState('idle');
    start();
    inputRef.current?.focus();
  }, [engine, start]);

  const handlePause = useCallback(() => {
    pause();
    // Drop focus so stray keystrokes cannot queue up behind the pause.
    inputRef.current?.blur();
  }, [pause]);

  const handleResume = useCallback(() => {
    resume();
    inputRef.current?.focus();
  }, [resume]);

  const handleRestart = useCallback(() => {
    setModalOpen(false);
    resetClock();
    handleStart();
  }, [handleStart, resetClock]);

  const finalAccuracy =
    finalScore.correctChars + finalScore.errors === 0
      ? 0
      : finalScore.correctChars / (finalScore.correctChars + finalScore.errors);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16">
      <header>
        <h1 className="font-display text-[46px] leading-[0.95] tracking-[-0.03em] text-ink sm:text-[54px]">
          Typing Speed Test
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-[1.7] text-ink-soft">
          Type the passage for 60 seconds. A wrong key holds the cursor in place until you correct it.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        {!running && (
          <button type="button" onClick={handleStart} disabled={quotesLoading} className={PRIMARY_BUTTON}>
            Start test
          </button>
        )}

        {running && (
          <>
            <button
              type="button"
              onClick={paused ? handleResume : handlePause}
              className={PRIMARY_BUTTON}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={handleStart} className={SECONDARY_BUTTON}>
              Restart
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <TimerBox remaining={remaining} paused={paused} />
        <ScoreBox correctChars={engine.correctChars} errors={engine.errors} />
      </div>

      <Passage
        passage={engine.passage}
        index={engine.index}
        errorAt={engine.errorAt}
        errorSeq={engine.errors}
        active={active}
        paused={paused}
        loading={quotesLoading}
        inputRef={inputRef}
        onKey={engine.handleKey}
      />

      <HistoryList
        results={results}
        loading={historyLoading}
        sources={sources}
        activeSource={source}
        onSelectSource={handleSelectSource}
      />

      <footer className="pb-2 text-xs text-clay">
        Quotes from{' '}
        <a
          href="https://zenquotes.io/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-clay-faint underline-offset-4 transition-colors duration-200 hover:text-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          ZenQuotes.io
        </a>
      </footer>

      <ResultModal
        open={modalOpen}
        wpm={Math.round(finalScore.correctChars / 5)}
        correctChars={finalScore.correctChars}
        errors={finalScore.errors}
        accuracy={finalAccuracy}
        saveState={saveState}
        onClose={() => setModalOpen(false)}
        onRestart={handleRestart}
      />
    </main>
  );
}
