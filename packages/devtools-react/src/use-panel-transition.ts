import { useCallback, useEffect, useState, type SetStateAction } from 'react';

type Phase = 'closed' | 'opening' | 'open' | 'closing';

/** Shared motion and lifecycle for the floating panel and toolbar drawer. */
export function usePanelTransition(initialOpen = false) {
  const [phase, setPhase] = useState<Phase>(initialOpen ? 'opening' : 'closed');
  const open = phase === 'opening' || phase === 'open';
  const finish = useCallback(() => {
    setPhase((current) =>
      current === 'opening'
        ? 'open'
        : current === 'closing'
          ? 'closed'
          : current
    );
  }, []);
  useEffect(() => {
    if (phase !== 'opening' && phase !== 'closing') return;
    // Complete even when host styles disable animation events.
    const timeout = setTimeout(finish, phase === 'opening' ? 280 : 220);
    return () => clearTimeout(timeout);
  }, [phase, finish]);
  const setOpen = useCallback((next: SetStateAction<boolean>) => {
    setPhase((current) => {
      const wasOpen = current === 'open' || current === 'opening';
      const value = typeof next === 'function' ? next(wasOpen) : next;
      return value === wasOpen ? current : value ? 'opening' : 'closing';
    });
  }, []);
  return {
    phase,
    open,
    present: phase !== 'closed',
    setOpen,
    finish,
    animation:
      phase === 'opening'
        ? 'react-layout-devtools-enter 280ms cubic-bezier(0.22, 1, 0.36, 1) both'
        : phase === 'closing'
          ? 'react-layout-devtools-exit 220ms cubic-bezier(0.4, 0, 1, 1) both'
          : undefined,
  };
}
