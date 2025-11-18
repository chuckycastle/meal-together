/**
 * CookingSessionPage Component
 * Multi-timer cooking interface with real-time sync
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useRecipe } from '../../hooks/useRecipes';
import {
  useActiveSessions,
  useCookingSession,
  useStartCookingSession,
  useCompleteCookingSession,
  useStartTimer,
  usePauseTimer,
  useResumeTimer,
  useCancelTimer,
} from '../../hooks/useCookingSessions';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { TimerCard } from '../../components/cooking';
import { Layout } from '../../components/layout/Layout';

export const CookingSessionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeFamily } = useFamily();
  const { on, isConnected } = useWebSocket();
  const [updatingTimers, setUpdatingTimers] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recipeId = searchParams.get('recipe');

  // Get active sessions
  const { data: activeSessions = [] } = useActiveSessions(activeFamily?.id);
  const activeSession = activeSessions[0]; // Use first active session

  // Get session details
  const {
    data: session,
    refetch,
  } = useCookingSession(activeFamily?.id, activeSession?.id);

  // Get recipe details
  const { data: recipe } = useRecipe(
    activeFamily?.id,
    recipeId ? parseInt(recipeId, 10) : session?.recipe_id
  );

  // Mutations
  const startSession = useStartCookingSession(activeFamily?.id || 0);
  const completeSession = useCompleteCookingSession(activeFamily?.id || 0);
  const startTimer = useStartTimer(activeFamily?.id || 0, activeSession?.id || 0);
  const pauseTimer = usePauseTimer(activeFamily?.id || 0, activeSession?.id || 0);
  const resumeTimer = useResumeTimer(activeFamily?.id || 0, activeSession?.id || 0);
  const cancelTimer = useCancelTimer(activeFamily?.id || 0, activeSession?.id || 0);

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected || !activeSession) return;

    const handleTimerUpdate = () => {
      refetch();
    };

    const handleTimerCompleted = () => {
      // Play sound when timer completes
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      refetch();
    };

    const unsubscribeStarted = on('timer_started', handleTimerUpdate);
    const unsubscribePaused = on('timer_paused', handleTimerUpdate);
    const unsubscribeResumed = on('timer_resumed', handleTimerUpdate);
    const unsubscribeCompleted = on('timer_completed', handleTimerCompleted);
    const unsubscribeCancelled = on('timer_cancelled', handleTimerUpdate);

    return () => {
      unsubscribeStarted();
      unsubscribePaused();
      unsubscribeResumed();
      unsubscribeCompleted();
      unsubscribeCancelled();
    };
  }, [on, isConnected, activeSession, refetch]);

  const handleStartSession = async () => {
    if (!recipeId) return;

    await startSession.mutateAsync({
      recipe_id: parseInt(recipeId, 10),
    });
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;

    if (!window.confirm('End this cooking session?')) {
      return;
    }

    await completeSession.mutateAsync(activeSession.id);
    navigate('/recipes');
  };

  const handleStartTimer = async (timerId: number) => {
    setUpdatingTimers((prev) => new Set(prev).add(timerId));
    try {
      const timer = session?.active_timers?.find((t) => t.id === timerId);
      if (timer) {
        await startTimer.mutateAsync({
          name: timer.name,
          duration: timer.duration,
        });
      }
    } finally {
      setUpdatingTimers((prev) => {
        const next = new Set(prev);
        next.delete(timerId);
        return next;
      });
    }
  };

  const handlePauseTimer = async (timerId: number) => {
    setUpdatingTimers((prev) => new Set(prev).add(timerId));
    try {
      await pauseTimer.mutateAsync(timerId);
    } finally {
      setUpdatingTimers((prev) => {
        const next = new Set(prev);
        next.delete(timerId);
        return next;
      });
    }
  };

  const handleResumeTimer = async (timerId: number) => {
    setUpdatingTimers((prev) => new Set(prev).add(timerId));
    try {
      await resumeTimer.mutateAsync(timerId);
    } finally {
      setUpdatingTimers((prev) => {
        const next = new Set(prev);
        next.delete(timerId);
        return next;
      });
    }
  };

  const handleCancelTimer = async (timerId: number) => {
    if (!window.confirm('Cancel this timer?')) {
      return;
    }

    await cancelTimer.mutateAsync(timerId);
  };

  if (!activeFamily) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Please select a family to start cooking
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Start session if recipe ID provided but no active session
  if (recipeId && !activeSession && !startSession.isPending) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Start Cooking {recipe?.name}?
            </h2>
            <p className="text-gray-600 mb-6">
              This will create a new cooking session with timers for this recipe
            </p>
            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={handleStartSession}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                </svg>
                Start Cooking
              </button>
              <button
                onClick={() => navigate('/recipes')}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!activeSession) {
    return (
      <Layout>
        <div className="p-6">
          <EmptyState
            title="No active cooking session"
            description="Start cooking a recipe to use timers"
            action={{
              label: 'Browse Recipes',
              onClick: () => navigate('/recipes'),
            }}
          />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  const timers = session.active_timers || [];
  const completedTimers = timers.filter((t) => t.is_completed).length;
  const totalTimers = timers.length;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Audio element for notifications */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,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"
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {session.recipe?.name}
            </h1>
            <p className="text-gray-600">Cooking Session</p>
          </div>

          {/* Connection & Complete */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Synced' : 'Offline'}
              </span>
            </div>

            <button
              onClick={handleCompleteSession}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Progress */}
        {totalTimers > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Timer Progress
              </span>
              <span className="text-sm text-gray-600">
                {completedTimers} of {totalTimers} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${(completedTimers / totalTimers) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Timers Grid */}
      {timers.length === 0 ? (
        <EmptyState
          title="No timers configured"
          description="This recipe doesn't have any timers set up"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timers.map((timer) => (
            <TimerCard
              key={timer.id}
              timer={timer}
              onStart={handleStartTimer}
              onPause={handlePauseTimer}
              onResume={handleResumeTimer}
              onCancel={handleCancelTimer}
              isUpdating={updatingTimers.has(timer.id)}
            />
          ))}
        </div>
      )}

      {/* Cooking Steps */}
      {session.recipe?.steps && session.recipe.steps.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Cooking Steps
          </h2>
          <ol className="space-y-3">
            {session.recipe.steps
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                    {step.order}
                  </span>
                  <p className="flex-1 text-gray-700 pt-1">{step.instruction}</p>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
    </Layout>
  );
};
