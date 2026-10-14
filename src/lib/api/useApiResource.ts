import { useCallback, useEffect, useState } from 'react';

export function useApiResource<T>(loader: () => Promise<T>, deps: readonly unknown[] = []) {
  const [result, setResult] = useState<{ key: string; data: T } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([...deps, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    loader().then((result) => {
      if (active) {
        setResult({ key, data: result });
        setFailure(null);
      }
    }).catch((cause: unknown) => {
      if (active) {
        setFailure({ key, message: cause instanceof Error ? cause.message : 'Could not load this data.' });
      }
    });
    return () => { active = false; };
    // The caller owns loader identity and supplies its reactive dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]);

  const current = result?.key === key ? result.data : null;
  const error = failure?.key === key ? failure.message : null;
  return { data: current, loading: current === null && error === null, error, refresh };
}
