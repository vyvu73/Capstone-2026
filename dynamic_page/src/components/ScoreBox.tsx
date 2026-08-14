interface Props {
  correctChars: number;
  errors: number;
}

/** Sits beside the timer and counts correctly typed characters live. */
export function ScoreBox({ correctChars, errors }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 rounded-2xl border border-clay-faint/70 bg-paper-raised px-6 py-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-clay">
        Correct characters
      </span>
      <div className="font-display text-[58px] leading-none tracking-[-0.03em] tabular-nums text-ember">
        {correctChars}
      </div>
      <span className="text-xs text-clay">
        {errors} {errors === 1 ? 'mistake' : 'mistakes'}
      </span>
    </div>
  );
}
