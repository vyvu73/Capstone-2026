import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { CharState } from '../lib/types';

interface Props {
  passage: string;
  index: number;
  errorAt: number | null;
  /** Total mistakes so far. Only used to re-trigger the shake on repeat misses. */
  errorSeq: number;
  /** Clock is running and not paused -- the only time keystrokes count. */
  active: boolean;
  paused: boolean;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onKey: (key: string) => void;
}

const CHAR_CLASS: Record<CharState, string> = {
  // Typed correctly -- this is the "darker" state the test is built around.
  done: 'text-ink',
  // Cursor position, still waiting to be typed.
  active: 'text-clay',
  // Wrong key pressed here. Deliberately NOT darkened -- the character keeps the
  // untyped colour and is flagged with a wash and a rule instead, so it can never
  // be mistaken for one that has been typed correctly.
  error:
    'text-clay bg-ember-soft/55 rounded-[3px] underline decoration-ember-deep decoration-2 underline-offset-[3px]',
  pending: 'text-clay',
};

// Fade both ends: once the view scrolls, the top line is sliced through the
// middle of its glyphs and reads as a bug rather than as more text above.
const MASK = 'linear-gradient(to bottom, transparent 0%, #000 11%, #000 87%, transparent 100%)';

/** Words stay whole: each token is an inline-block so lines break between words. */
function useTokens(passage: string) {
  return useMemo(() => {
    const parts = passage.split(' ');
    let start = 0;
    return parts.map((word, i) => {
      const text = i < parts.length - 1 ? `${word} ` : word;
      const token = { text, start };
      start += text.length;
      return token;
    });
  }, [passage]);
}

export function Passage({
  passage,
  index,
  errorAt,
  errorSeq,
  active,
  paused,
  loading,
  inputRef,
  onKey,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const tokens = useTokens(passage);

  // Keep the cursor line vertically centred as the typist works down the text.
  useEffect(() => {
    const container = scrollRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const target = active.offsetTop - container.clientHeight / 2 + active.offsetHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [index]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Leave browser and OS shortcuts alone.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Tab') return;
    event.preventDefault();
    onKey(event.key);
  };

  const stateFor = (charIndex: number): CharState => {
    if (charIndex < index) return 'done';
    if (charIndex === index) return errorAt === index ? 'error' : 'active';
    return 'pending';
  };

  const showFocusPrompt = active && !focused;
  const obscured = showFocusPrompt || paused;

  return (
    <section
      className="relative rounded-2xl border border-clay-faint/70 bg-paper-raised p-6 sm:p-8"
      onClick={() => !paused && inputRef.current?.focus()}
    >
      <div
        ref={scrollRef}
        style={{ maskImage: MASK, WebkitMaskImage: MASK }}
        className={`h-[19.25rem] overflow-hidden font-mono text-[19px] leading-[2.1] tracking-[0.01em] transition-[opacity,filter] duration-300 ease-out sm:text-[21px] ${
          obscured ? 'opacity-30 blur-[2px]' : 'opacity-100'
        }`}
      >
        {loading ? (
          <p className="text-clay">Loading quotes…</p>
        ) : (
          tokens.map((token) => (
            <span key={token.start} className="inline-block whitespace-pre">
              {[...token.text].map((char, offset) => {
                const charIndex = token.start + offset;
                const state = stateFor(charIndex);
                const isCursor = state === 'active' || state === 'error';
                return (
                  <span
                    // Remounting on each fresh mistake replays the shake.
                    key={state === 'error' ? `${charIndex}-e${errorSeq}` : charIndex}
                    ref={isCursor ? activeRef : undefined}
                    className={`relative ${CHAR_CLASS[state]}`}
                    style={state === 'error' ? { animation: 'shake 140ms ease-in-out' } : undefined}
                  >
                    {isCursor && active && (
                      <span
                        aria-hidden="true"
                        className="absolute -left-[2px] top-[0.22em] h-[1.25em] w-[2px] rounded-full bg-ember"
                        style={{ animation: 'caret-blink 1.05s steps(1, end) infinite' }}
                      />
                    )}
                    {char}
                  </span>
                );
              })}
            </span>
          ))
        )}
      </div>

      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-clay-faint bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink-soft">
            Paused
          </span>
        </div>
      )}

      {showFocusPrompt && (
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="absolute inset-0 flex items-center justify-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          <span className="rounded-full border border-clay-faint bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink-soft">
            Click here to keep typing
          </span>
        </button>
      )}

      {/* Visually hidden, but a real focusable input so mobile keyboards open. */}
      <input
        ref={inputRef}
        type="text"
        value=""
        onChange={() => undefined}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Typing input"
        className="absolute left-0 top-0 h-px w-px opacity-0"
      />
    </section>
  );
}
