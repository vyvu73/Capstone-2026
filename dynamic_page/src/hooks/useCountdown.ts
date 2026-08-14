import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  durationSec: number;
  onComplete: () => void;
}

/**
 * Deadline-based rather than decrement-based: we store the wall-clock moment the
 * test ends and derive the remaining seconds from it. A `setInterval` that
 * subtracts 1 each tick drifts badly when the tab is throttled; this does not.
 *
 * Pausing works by banking the milliseconds that were left and rebuilding the
 * deadline from `now` on resume, so a long pause costs the typist nothing.
 */
export function useCountdown({ durationSec, onComplete }: Options) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const deadlineRef = useRef<number | null>(null);
  const bankedMsRef = useRef(durationSec * 1000);

  // Kept in a ref so the ticking effect never has to restart when the callback
  // identity changes.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const start = useCallback(() => {
    deadlineRef.current = Date.now() + durationSec * 1000;
    bankedMsRef.current = durationSec * 1000;
    setRemaining(durationSec);
    setPaused(false);
    setRunning(true);
  }, [durationSec]);

  const pause = useCallback(() => {
    if (deadlineRef.current === null) return;
    bankedMsRef.current = Math.max(0, deadlineRef.current - Date.now());
    deadlineRef.current = null;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (deadlineRef.current !== null) return;
    deadlineRef.current = Date.now() + bankedMsRef.current;
    setPaused(false);
  }, []);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    bankedMsRef.current = durationSec * 1000;
    setRunning(false);
    setPaused(false);
    setRemaining(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (!running || paused) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);

      if (left === 0) {
        setRunning(false);
        setPaused(false);
        deadlineRef.current = null;
        onCompleteRef.current();
      }
    };

    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running, paused]);

  return { remaining, running, paused, start, pause, resume, reset };
}
