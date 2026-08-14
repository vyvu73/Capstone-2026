interface Props {
  remaining: number;
  paused: boolean;
}

/** The square that holds the countdown. */
export function TimerBox({ remaining, paused }: Props) {
  const urgent = remaining <= 10;

  return (
    <div
      className="flex aspect-square w-[150px] shrink-0 flex-col items-center justify-center rounded-2xl border border-clay-faint/70 bg-paper-raised"
      role="timer"
      aria-live="off"
    >
      <span
        className={`font-display text-[58px] leading-none tracking-[-0.03em] tabular-nums ${
          urgent ? 'text-ember-deep' : 'text-ink'
        }`}
      >
        {remaining}
      </span>
      <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-clay">
        {paused ? 'Paused' : 'Seconds'}
      </span>
    </div>
  );
}
