import { useEffect, useRef, useState } from 'react';
import { HistoryList } from './components/HistoryList';
import { Passage } from './components/Passage';
import { ResultModal } from './components/ResultModal';
import { fetchHealth, fetchQuotes, fetchResults, saveResult } from './lib/api';
import type { SourceInfo, StoreId, TestResult } from './lib/api';

const DURATION_SEC = 60;
// How many quotes we join together to make the text you type.
const QUOTES_PER_PASSAGE = 12;

const PRIMARY_BUTTON =
  'rounded-full bg-ember px-6 py-3 text-sm font-semibold text-paper-raised transition-colors duration-200 hover:bg-ember-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-deep active:bg-ember-deep disabled:cursor-not-allowed disabled:opacity-50';

const SECONDARY_BUTTON =
  'rounded-full border border-clay-faint bg-paper-raised px-6 py-3 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:border-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:border-clay';

// Picks random quotes and joins them into one long block of text to type.
function buildPassage(quotes: string[], count: number): string {
  if (quotes.length === 0) return '';

  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(quotes[Math.floor(Math.random() * quotes.length)]);
  }

  return picked.join(' ');
}

export default function App() {
  const [quotes, setQuotes] = useState<string[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // The text to type, and how far through it you are. The cursor only moves
  // on a correct key, so typedCount is also your number of correct characters.
  const [passage, setPassage] = useState('');
  const [typedCount, setTypedCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongKey, setWrongKey] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(DURATION_SEC);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');

  const [showResult, setShowResult] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Past runs, and which database we are reading them from.
  const [results, setResults] = useState<TestResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [source, setSource] = useState<StoreId | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const running = status === 'running';
  const paused = status === 'paused';
  const started = running || paused;

  async function loadResults(from: StoreId | null) {
    setLoadingResults(true);
    try {
      const data = await fetchResults(from);
      setResults(data.results);
    } catch (error) {
      console.error('Could not load past runs:', error);
    } finally {
      setLoadingResults(false);
    }
  }

  // Load the quotes once, when the page opens.
  useEffect(() => {
    fetchQuotes()
      .then((data) => {
        setQuotes(data.quotes);
        setPassage(buildPassage(data.quotes, QUOTES_PER_PASSAGE));
      })
      .catch((error) => console.error('Could not load quotes:', error))
      .finally(() => setLoadingQuotes(false));
  }, []);

  // Ask which databases are connected before reading, so the buttons on the
  // past-runs list only offer databases the server can actually read from.
  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setSources(data.sources);
        setSource(data.defaultSource);
        loadResults(data.defaultSource);
      })
      .catch((error) => {
        console.error('Could not reach the server:', error);
        loadResults(null);
      });
  }, []);

  // Count down one second at a time while the test is running. Pausing stops
  // the timer, and React runs the cleanup below to clear it.
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  // When the clock hits zero the test is over.
  useEffect(() => {
    if (running && secondsLeft === 0) {
      finishTest();
    }
  }, [running, secondsLeft]);

  // Add more text before a fast typist reaches the end of the passage.
  useEffect(() => {
    if (passage && typedCount > passage.length - 200) {
      setPassage(`${passage} ${buildPassage(quotes, 8)}`);
    }
  }, [typedCount, passage, quotes]);

  function startTest() {
    setPassage(buildPassage(quotes, QUOTES_PER_PASSAGE));
    setTypedCount(0);
    setMistakes(0);
    setWrongKey(false);
    setSecondsLeft(DURATION_SEC);
    setShowResult(false);
    setSaveFailed(false);
    setStatus('running');
    inputRef.current?.focus();
  }

  function pauseTest() {
    setStatus('paused');
    // Drop focus so keys pressed while paused are ignored.
    inputRef.current?.blur();
  }

  function resumeTest() {
    setStatus('running');
    inputRef.current?.focus();
  }

  async function finishTest() {
    setStatus('done');
    setShowResult(true);
    inputRef.current?.blur();

    // A run where nothing was typed is not a score worth keeping.
    if (typedCount === 0) return;

    try {
      await saveResult(typedCount, mistakes, DURATION_SEC);
      await loadResults(source);
    } catch (error) {
      console.error('Could not save the result:', error);
      setSaveFailed(true);
    }
  }

  // Called for every key pressed in the hidden input.
  function handleKey(key: string) {
    if (!running) return;

    if (key === 'Backspace') {
      setTypedCount(Math.max(0, typedCount - 1));
      setWrongKey(false);
      return;
    }

    // Anything longer than one character is a key like Shift or ArrowLeft.
    if (key.length !== 1) return;

    if (key === passage[typedCount]) {
      setTypedCount(typedCount + 1);
      setWrongKey(false);
    } else {
      // Wrong key: count the mistake but do not move the cursor forward.
      setMistakes(mistakes + 1);
      setWrongKey(true);
    }
  }

  function chooseSource(next: StoreId) {
    setSource(next);
    loadResults(next);
  }

  const totalKeystrokes = typedCount + mistakes;
  const accuracy = totalKeystrokes === 0 ? 0 : typedCount / totalKeystrokes;

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
        {!started && (
          <button
            type="button"
            onClick={startTest}
            disabled={loadingQuotes}
            className={PRIMARY_BUTTON}
          >
            Start test
          </button>
        )}

        {started && (
          <>
            <button
              type="button"
              onClick={paused ? resumeTest : pauseTest}
              className={PRIMARY_BUTTON}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={startTest} className={SECONDARY_BUTTON}>
              Restart
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* The countdown. */}
        <div className="flex aspect-square w-[150px] shrink-0 flex-col items-center justify-center rounded-2xl border border-clay-faint/70 bg-paper-raised">
          <span
            className={`font-display text-[58px] leading-none tracking-[-0.03em] tabular-nums ${
              secondsLeft <= 10 ? 'text-ember-deep' : 'text-ink'
            }`}
          >
            {secondsLeft}
          </span>
          <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-clay">
            {paused ? 'Paused' : 'Seconds'}
          </span>
        </div>

        {/* The live score. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 rounded-2xl border border-clay-faint/70 bg-paper-raised px-6 py-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-clay">
            Correct characters
          </span>
          <span className="font-display text-[58px] leading-none tracking-[-0.03em] tabular-nums text-ember">
            {typedCount}
          </span>
          <span className="text-xs text-clay">
            {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}
          </span>
        </div>
      </div>

      <Passage
        passage={passage}
        typedCount={typedCount}
        wrongKey={wrongKey}
        paused={paused}
        loading={loadingQuotes}
        inputRef={inputRef}
        onKey={handleKey}
      />

      <HistoryList
        results={results}
        loading={loadingResults}
        sources={sources}
        activeSource={source}
        onChooseSource={chooseSource}
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

      {showResult && (
        <ResultModal
          wpm={Math.round(typedCount / 5)}
          correctChars={typedCount}
          mistakes={mistakes}
          accuracy={accuracy}
          saveFailed={saveFailed}
          onClose={() => setShowResult(false)}
          onRestart={startTest}
        />
      )}
    </main>
  );
}
