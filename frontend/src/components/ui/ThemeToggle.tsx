import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        {theme === 'dark' ? (
          <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-500" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Theme
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </p>
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={theme === 'dark'}
        aria-label="Toggle theme"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
