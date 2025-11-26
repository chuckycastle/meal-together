/**
 * CookingStepList Component
 * Displays ordered cooking instructions
 */

import type { CookingStep } from '../../types';

interface CookingStepListProps {
  steps: CookingStep[];
}

export const CookingStepList = ({ steps }: CookingStepListProps) => {
  if (steps.length === 0) {
    return (
      <p className="text-gray-800 dark:text-gray-300 italic">No cooking steps listed</p>
    );
  }

  // Sort by order
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <ol className="space-y-4">
      {sortedSteps.map((step) => (
        <li key={step.id} className="flex gap-4">
          <div className="flex-shrink-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
              {step.order}
            </span>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-gray-800 dark:text-gray-300 leading-relaxed">{step.instruction}</p>
            {step.estimated_time && (
              <p className="text-sm text-gray-800 dark:text-gray-400 mt-1">
                <svg
                  className="w-4 h-4 inline mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                About {step.estimated_time} minutes
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
