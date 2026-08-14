import { useCallback, useEffect, useRef, useState } from 'react';

/** Quotes stitched into the passage on the first build. */
const INITIAL_QUOTE_COUNT = 12;
/** More are appended once the typist gets this far through what is on screen. */
const REFILL_THRESHOLD = 0.7;
const REFILL_QUOTE_COUNT = 8;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPassage(quotes: readonly string[], count: number): string {
  if (quotes.length === 0) return '';
  const picked: string[] = [];
  // Reshuffle each time we exhaust the pool, so a short pool still varies.
  while (picked.length < count) {
    picked.push(...shuffle(quotes).slice(0, count - picked.length));
  }
  return picked.join(' ');
}

interface Options {
  quotes: readonly string[];
  /** Keystrokes are only accepted while the clock is running. */
  active: boolean;
}

export function useTypingEngine({ quotes, active }: Options) {
  const [passage, setPassage] = useState('');
  /**
   * How far the typist has advanced. Because the cursor only moves on a correct
   * keystroke, this doubles as the count of correctly typed characters.
   */
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  /** Index currently showing a wrong keystroke, or null. Never darkened. */
  const [errorAt, setErrorAt] = useState<number | null>(null);

  // Keystroke handling reads these synchronously, so they live in refs rather
  // than being closed over from a possibly stale render.
  const indexRef = useRef(0);
  const passageRef = useRef('');
  passageRef.current = passage;

  const rebuild = useCallback(() => {
    indexRef.current = 0;
    setPassage(buildPassage(quotes, INITIAL_QUOTE_COUNT));
    setIndex(0);
    setErrors(0);
    setErrorAt(null);
  }, [quotes]);

  // Build on mount and whenever a fresh set of quotes arrives.
  useEffect(() => {
    rebuild();
  }, [rebuild]);

  // Keep the passage longer than anyone can type in 60 seconds.
  useEffect(() => {
    if (passage.length > 0 && index > passage.length * REFILL_THRESHOLD) {
      const extra = buildPassage(quotes, REFILL_QUOTE_COUNT);
      setPassage((current) => `${current} ${extra}`);
    }
  }, [index, passage.length, quotes]);

  const handleKey = useCallback(
    (key: string) => {
      if (!active) return;

      if (key === 'Backspace') {
        if (indexRef.current > 0) {
          indexRef.current -= 1;
          setIndex(indexRef.current);
        }
        setErrorAt(null);
        return;
      }

      // Length-1 filters out Shift, Control, ArrowLeft, Tab and friends.
      if (key.length !== 1) return;

      if (key === passageRef.current[indexRef.current]) {
        indexRef.current += 1;
        setIndex(indexRef.current);
        setErrorAt(null);
        return;
      }

      // Wrong key: record the miss and mark the position, but *do not advance*.
      // The character stays undarkened until the right key arrives.
      setErrors((count) => count + 1);
      setErrorAt(indexRef.current);
    },
    [active],
  );

  return {
    passage,
    index,
    correctChars: index,
    errors,
    errorAt,
    handleKey,
    reset: rebuild,
  };
}
