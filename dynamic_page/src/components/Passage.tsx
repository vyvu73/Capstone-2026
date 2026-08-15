import { useEffect, useRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

interface Props {
  passage: string;
  typedCount: number;
  wrongKey: boolean;
  paused: boolean;
  loading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onKey: (key: string) => void;
}

// The text you type. Every character is its own <span> so we can colour them
// one at a time as you go.
export function Passage({
  passage,
  typedCount,
  wrongKey,
  paused,
  loading,
  inputRef,
  onKey,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  // Scroll the box so the character you are on stays roughly in the middle.
  useEffect(() => {
    const box = boxRef.current;
    const cursor = cursorRef.current;

    if (box && cursor) {
      box.scrollTop = cursor.offsetTop - box.clientHeight / 2;
    }
  }, [typedCount]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Leave browser shortcuts like Ctrl+R and tabbing away alone.
    if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab') return;

    event.preventDefault();
    onKey(event.key);
  }

  function classForChar(position: number): string {
    if (position < typedCount) return 'text-ink'; // typed correctly
    if (position > typedCount) return 'text-clay'; // not reached yet

    // This is where the cursor is. If the last key was wrong we highlight it
    // in red but leave the character light, so a mistake can never look like
    // progress.
    return wrongKey ? 'rounded-sm bg-ember-soft text-ember-deep' : 'rounded-sm bg-clay-faint text-ink-soft';
  }

  // Split into words so a word is never broken across two lines.
  const words = passage.split(' ');
  let position = 0;

  return (
    <section
      className="relative rounded-2xl border border-clay-faint/70 bg-paper-raised p-6 sm:p-8"
      onClick={() => !paused && inputRef.current?.focus()}
    >
      <div
        ref={boxRef}
        className={`h-[19.25rem] overflow-hidden font-mono text-[19px] leading-[2.1] sm:text-[21px] ${
          paused ? 'opacity-30' : ''
        }`}
      >
        {loading ? (
          <p className="text-clay">Loading quotes...</p>
        ) : (
          words.map((word, i) => {
            // Keep the space that followed the word, except on the last one.
            const text = i < words.length - 1 ? `${word} ` : word;
            const start = position;
            position += text.length;

            return (
              <span key={start} className="inline-block whitespace-pre">
                {[...text].map((char, offset) => (
                  <span
                    key={start + offset}
                    ref={start + offset === typedCount ? cursorRef : undefined}
                    className={classForChar(start + offset)}
                  >
                    {char}
                  </span>
                ))}
              </span>
            );
          })
        )}
      </div>

      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-clay-faint bg-paper-raised px-5 py-2.5 text-sm font-medium text-ink-soft">
            Paused
          </span>
        </div>
      )}

      {/* A real input, hidden off to the side. We need one so that typing has
          somewhere to go and so mobile keyboards open when you tap the box. */}
      <input
        ref={inputRef}
        type="text"
        value=""
        onChange={() => undefined}
        onKeyDown={handleKeyDown}
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
