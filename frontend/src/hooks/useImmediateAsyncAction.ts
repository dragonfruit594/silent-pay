import * as React from 'react';
import { flushSync } from 'react-dom';

/**
 * Runs an async action with an immediate UI update:
 * - flushSync(setBusy(true)) so the button visually switches instantly
 * - setTimeout(..., 0) so the browser can paint before MetaMask potentially blocks
 */
export function useImmediateAsyncAction() {
  const [busy, setBusy] = React.useState(false);

  const run = React.useCallback(
    (fn: () => Promise<void> | void) => {
      if (busy) return;
      flushSync(() => setBusy(true));
      setTimeout(async () => {
        try {
          await Promise.resolve(fn());
        } finally {
          setBusy(false);
        }
      }, 0);
    },
    [busy]
  );

  return { busy, run };
}

export function useImmediateAsyncKeyed() {
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const run = React.useCallback((key: string, fn: () => Promise<void> | void) => {
    if (busyKey) return;
    flushSync(() => setBusyKey(key));
    setTimeout(async () => {
      try {
        await Promise.resolve(fn());
      } finally {
        setBusyKey((cur) => (cur === key ? null : cur));
      }
    }, 0);
  }, [busyKey]);

  return { busyKey, run };
}


