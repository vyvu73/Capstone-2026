import { useEffect, useRef } from 'react';

interface Props {
  wpm: number;
  correctChars: number;
  mistakes: number;
  accuracy: number; // 0 to 1
  saveFailed: boolean;
  onClose: () => void;
  onRestart: () => void;
}

// The popup that shows your score when the clock runs out.
export function ResultModal({
  wpm,
  correctChars,
  mistakes,
  accuracy,
  saveFailed,
  onClose,
  onRestart,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the panel rather than a button. You are still typing when the
    // clock runs out, and your next key (usually a space) would press a
    // focused button and restart the test before you read anything.
    panelRef.current?.focus();

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {/* Dimmed background. Clicking it closes the popup. */}
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl border border-clay-faint/70 bg-paper-raised p-7 shadow-float outline-none"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ember">Time is up</p>

        <h2
          id="result-title"
          className="mt-2.5 font-display text-[38px] leading-[1.05] tracking-[-0.03em]"
        >
          You typed <span className="text-ember">{wpm}</span> {wpm === 1 ? 'word' : 'words'}
        </h2>

        <p className="mt-3 text-sm leading-[1.7] text-ink-soft">
          {correctChars} correct characters, {mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'},{' '}
          {Math.round(accuracy * 100)}% accuracy.
        </p>

        {saveFailed && (
          <p className="mt-3 text-xs text-ember-deep">
            Could not reach the server, so this run was not saved.
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-paper-raised transition-colors duration-200 hover:bg-ember-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-deep active:bg-ember-deep"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-clay-faint bg-paper px-6 py-3 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:border-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:border-clay"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
