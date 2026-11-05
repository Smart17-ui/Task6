// Loads data from the API when a component appears, or when the path changes.
//
//   const { data, loading, error, reload } = useFetch('/courses');
//
// Pass null as the path to skip loading. reload() fetches again in the background,
// leaving the current data on screen until the new data arrives.
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useFetch(path) {
  const [result, setResult] = useState({ path: null, data: null, error: null });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!path) return undefined;

    // If the path changes before this request finishes, ignore its late answer so
    // old data can never overwrite newer data.
    let ignore = false;
    api
      .get(path)
      .then((data) => {
        if (!ignore) setResult({ path, data, error: null });
      })
      .catch((error) => {
        if (!ignore) setResult({ path, data: null, error });
      });

    return () => {
      ignore = true;
    };
  }, [path, reloadCount]);

  // The result only counts if it belongs to the path we are showing now.
  const isCurrent = result.path === path;

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: Boolean(path) && !isCurrent,
    reload: () => setReloadCount((count) => count + 1),
  };
}
