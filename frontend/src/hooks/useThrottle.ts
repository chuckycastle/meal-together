/**
 * useThrottle Hook
 * Throttles a callback to prevent excessive calls
 */

import { useMemo } from 'react';
import { throttle } from 'lodash-es';

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return useMemo(() => throttle(callback, delay) as T, [callback, delay]);
}
