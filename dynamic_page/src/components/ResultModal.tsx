import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  wpm: number;
  correctChars: number;
  errors: number;
  /** 0..1 */
  accuracy: number;
  saveState: 'saving' | 'saved' | 'failed' | 'idle';
  onClose: () => void;
  onRestart: () => void;
}

export function ResultModal({
  open,
  wpm,
  correctChars,
  errors,
  accuracy,
  saveState,
  onClose,
  onRestart,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the panel, never a button. The typist is mid-flow when the clock
    // runs out, and their next keystroke -- very often a space -- would
    // activate a focused button and restart the test before they read a thing.
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl border border-clay-faint/70 bg-paper-raised p-7 shadow-float outline-none"
        style={{ animation: 'rise-in 260ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ember">Time is up</p>

        <h2
          id="result-title"
          className="mt-2.5 font-display text-[38px] leading-[1.05] tracking-[-0.03em]"
        >
          You typed <span className="text-ember">{wpm}</span> {wpm === 1 ? 'word' : 'words'}
        </h2>

        <p className="mt-3 text-sm leading-[1.7] text-ink-soft">
          {correctChars} correct characters, {errors} {errors === 1 ? 'mistake' : 'mistakes'},{' '}
          {Math.round(accuracy * 100)}% accuracy.
        </p>

        {saveState === 'failed' && (
          <p className="mt-3 text-xs text-ember-deep">
            Could not reach the server, so this run was not saved.
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-paper-raised transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-deep active:translate-y-0 active:scale-[0.98]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-clay-faint bg-paper px-6 py-3 text-sm font-semibold text-ink-soft transition-transform duration-200 ease-spring hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember active:translate-y-0 active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
