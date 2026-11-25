/**
 * useNow
 * Current time that re-renders the caller on an interval
 */

import { useEffect, useState } from 'react';

export const useNow = (intervalMs: number = 30000): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
};
