/**
 * RecipeTimeline Component
 * Visual timeline showing recipe cooking schedule
 */

import type { Recipe } from '../../types';

interface TimelineEntry {
  recipe: Recipe;
  startTime: Date;
  endTime: Date;
}

interface RecipeTimelineProps {
  entries: TimelineEntry[];
  targetTime: Date;
}

export const RecipeTimeline = ({ entries, targetTime }: RecipeTimelineProps) => {
  if (entries.length === 0) {
    return null;
  }

  // Find the earliest start time
  const earliestStart = entries.reduce((earliest, entry) => {
    return entry.startTime < earliest ? entry.startTime : earliest;
  }, entries[0].startTime);

  // Calculate total timeline duration in minutes
  const totalDuration = Math.ceil((targetTime.getTime() - earliestStart.getTime()) / 60000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getBarPosition = (startTime: Date) => {
    const offset = (startTime.getTime() - earliestStart.getTime()) / 60000;
    return (offset / totalDuration) * 100;
  };

  const getBarWidth = (duration: number) => {
    return (duration / totalDuration) * 100;
  };

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Visual Timeline
      </h3>

      {/* Timeline Header */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-medium">Start: </span>
          <span>{formatTime(earliestStart)}</span>
        </div>
        <div>
          <span className="font-medium">Target: </span>
          <span>{formatTime(targetTime)}</span>
        </div>
      </div>

      {/* Timeline Bars */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const position = getBarPosition(entry.startTime);
          const width = getBarWidth(entry.recipe.total_time);
          const color = colors[index % colors.length];

          return (
            <div key={entry.recipe.id} className="relative">
              {/* Recipe Label */}
              <div className="text-sm font-medium text-gray-700 mb-1 truncate">
                {entry.recipe.name}
              </div>

              {/* Timeline Track */}
              <div className="relative h-8 bg-gray-100 rounded">
                {/* Recipe Bar */}
                <div
                  className={`absolute h-full ${color} rounded flex items-center px-2 text-white text-xs font-medium`}
                  style={{
                    left: `${position}%`,
                    width: `${width}%`,
                  }}
                >
                  <span className="truncate">{entry.recipe.total_time} min</span>
                </div>

                {/* Start Time Marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-400"
                  style={{ left: `${position}%` }}
                >
                  <div className="absolute -top-5 left-0 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                    {formatTime(entry.startTime)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Target Time Marker */}
      <div className="relative mt-6 h-1 bg-gray-200 rounded">
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-600 rounded">
          <div className="absolute -top-5 right-0 transform translate-x-1/2 text-xs font-medium text-green-600 whitespace-nowrap">
            Target
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1">
            <span className="font-medium">Tip:</span> All recipes will be ready at the target time if you follow the schedule
          </p>
        </div>
      </div>
    </div>
  );
};
