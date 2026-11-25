/**
 * 404 Not Found Page
 * Shown when user navigates to invalid route
 */

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-counter px-4 text-ink">
      <div className="max-w-md">
        <h1 className="marker text-5xl">This page is not on the menu</h1>
        <p className="mt-3 text-ink-2">The address may be mistyped, or the page was moved or deleted.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/" className="btn btn-primary">
            Go to the kitchen
          </Link>
          <button type="button" onClick={() => window.history.back()} className="btn btn-outline">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
