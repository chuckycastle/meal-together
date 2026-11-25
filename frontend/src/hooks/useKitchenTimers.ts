/**
 * useKitchenTimers
 * The family's timer board. Timers are stored as timestamps on the server
 * and counted locally each second, corrected for the difference between
 * this device's clock and the server's. Chimes once when a countdown ends.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { apiClient } from '../services/api';
import { playChimeIfEnabled } from '../utils/audio/audioNotification';
import { useNow } from './useNow';
import type { BoardTimer, BoardTimerListResponse, CreateBoardTimerRequest, MarkerColor } from '../types';

export type KitchenTimerState = 'idle' | 'running' | 'paused' | 'done';

export interface KitchenTimer {
  id: number;
  name: string;
  kind: BoardTimer['kind'];
  color: MarkerColor;
  recipeId: number | null;
  recipeName: string | null;
  duration: number; // seconds set on the timer
  state: KitchenTimerState;
  /** Countdown: seconds left. Stopwatch: seconds elapsed. */
  seconds: number;
  /** Seconds past zero for a finished countdown */
  overtime: number;
  /** 0 to 1, how much of a countdown is left */
  fraction: number;
}

interface BoardCache extends BoardTimerListResponse {
  /** Server clock minus this device's clock, in milliseconds */
  offsetMs: number;
}

const rungTimers = create<{ rung: Record<number, true>; ring: (id: number) => void; unring: (id: number) => void }>(
  (set, get) => ({
    rung: {},
    ring: (id) => {
      if (get().rung[id]) return;
      set((state) => ({ rung: { ...state.rung, [id]: true } }));
      void playChimeIfEnabled();
    },
    unring: (id) => {
      if (!get().rung[id]) return;
      set((state) => {
        const rung = { ...state.rung };
        delete rung[id];
        return { rung };
      });
    },
  })
);

function withOffset(response: BoardTimerListResponse): BoardCache {
  return { ...response, offsetMs: new Date(response.server_time).getTime() - Date.now() };
}

function toView(timer: BoardTimer, serverNowMs: number): KitchenTimer {
  const base = {
    id: timer.id,
    name: timer.name,
    kind: timer.kind,
    color: timer.color,
    recipeId: timer.recipe_id,
    recipeName: timer.recipe_name,
    duration: timer.duration,
  };

  if (timer.kind === 'stopwatch') {
    const elapsed =
      timer.status === 'running' && timer.anchor_at
        ? (serverNowMs - new Date(timer.anchor_at).getTime()) / 1000
        : timer.held_seconds;
    return { ...base, state: timer.status, seconds: Math.max(0, elapsed), overtime: 0, fraction: 0 };
  }

  const left =
    timer.status === 'running' && timer.anchor_at
      ? (new Date(timer.anchor_at).getTime() - serverNowMs) / 1000
      : timer.held_seconds;
  const total = Math.max(timer.duration, left, 1);
  const done = timer.status === 'running' && left <= 0;

  return {
    ...base,
    state: done ? 'done' : timer.status,
    seconds: Math.max(0, left),
    overtime: done ? -left : 0,
    fraction: Math.min(1, Math.max(0, left / total)),
  };
}

export const useKitchenTimers = (familyId: number | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['timers', familyId] as const, [familyId]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => withOffset(await apiClient.getBoardTimers(familyId!)),
    enabled: !!familyId,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const hasRunning = !!data?.timers.some((timer) => timer.status === 'running');
  const now = useNow(hasRunning ? 1000 : 30000);

  const timers = useMemo(() => {
    if (!data) return [];
    const serverNowMs = now.getTime() + data.offsetMs;
    return data.timers.map((timer) => toView(timer, serverNowMs));
  }, [data, now]);

  const { ring, unring } = rungTimers();
  useEffect(() => {
    for (const timer of timers) {
      if (timer.state === 'done') ring(timer.id);
      else unring(timer.id);
    }
  }, [timers, ring, unring]);

  /** Put the server's copy of one timer into the cache */
  const put = useCallback(
    (response: { timer: BoardTimer; server_time: string }) => {
      queryClient.setQueryData<BoardCache>(queryKey, (current) => {
        const offsetMs = new Date(response.server_time).getTime() - Date.now();
        const existing = current?.timers ?? [];
        const next = existing.some((timer) => timer.id === response.timer.id)
          ? existing.map((timer) => (timer.id === response.timer.id ? response.timer : timer))
          : [...existing, response.timer];
        return { timers: next, server_time: response.server_time, offsetMs };
      });
    },
    [queryClient, queryKey]
  );

  const create = useCallback(
    async (request: CreateBoardTimerRequest) => {
      if (!familyId) return;
      put(await apiClient.createBoardTimer(familyId, request));
    },
    [familyId, put]
  );

  const change = useCallback(
    async (timer: Pick<KitchenTimer, 'id'>, action: 'start' | 'pause' | 'reset') => {
      if (!familyId) return;
      put(await apiClient.changeBoardTimer(familyId, timer.id, action));
    },
    [familyId, put]
  );

  const addTime = useCallback(
    async (timer: Pick<KitchenTimer, 'id'>, seconds: number) => {
      if (!familyId) return;
      put(await apiClient.addBoardTimerTime(familyId, timer.id, seconds));
    },
    [familyId, put]
  );

  const remove = useCallback(
    async (timer: Pick<KitchenTimer, 'id'>) => {
      if (!familyId) return;
      queryClient.setQueryData<BoardCache>(queryKey, (current) =>
        current ? { ...current, timers: current.timers.filter((candidate) => candidate.id !== timer.id) } : current
      );
      try {
        await apiClient.deleteBoardTimer(familyId, timer.id);
      } finally {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [familyId, queryClient, queryKey]
  );

  return {
    timers,
    isLoading,
    isError,
    create,
    start: (timer: Pick<KitchenTimer, 'id'>) => change(timer, 'start'),
    pause: (timer: Pick<KitchenTimer, 'id'>) => change(timer, 'pause'),
    reset: (timer: Pick<KitchenTimer, 'id'>) => change(timer, 'reset'),
    addTime,
    remove,
  };
};

export type KitchenTimers = ReturnType<typeof useKitchenTimers>;

/** Timers that need attention first: finished, then soonest to finish, then the rest */
export function byUrgency(a: KitchenTimer, b: KitchenTimer): number {
  const rank = (timer: KitchenTimer) =>
    timer.state === 'done' ? 0 : timer.state === 'running' ? 1 : timer.state === 'paused' ? 2 : 3;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.state === 'done') return b.overtime - a.overtime;
  if (a.kind !== b.kind) return a.kind === 'countdown' ? -1 : 1;
  return a.kind === 'countdown' ? a.seconds - b.seconds : a.name.localeCompare(b.name);
}
