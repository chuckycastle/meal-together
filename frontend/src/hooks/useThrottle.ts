/**
 * useThrottle Hook
 * Throttles a callback to prevent excessive calls
 */

import { useMemo } from 'react';
import { throttle, type DebouncedFunc } from 'lodash-es';

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunc<T> {
  return useMemo(() => throttle(callback, delay), [callback, delay]);
}
