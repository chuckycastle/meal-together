/**
 * LinkPage
 * Signs in a TV. The TV shows a code and a QR code that opens this page;
 * the signed-in person checks the code and approves it.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthFrame } from '../components/layout/AuthFrame';
import { Notice, Spinner } from '../components/kit';
import { useAuth } from '../contexts/AuthContext';
import { rememberReturnPath } from '../utils/returnPath';
import { apiClient } from '../services/api';

type Outcome = 'approved' | 'denied' | null;

const CODE_LENGTH = 8;

/** Keep letters and digits, upper case, with a dash after the fourth: ABCD-EFGH */
const formatCode = (value: string): string => {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
  return characters.length > 4 ? `${characters.slice(0, 4)}-${characters.slice(4)}` : characters;
};

const backLink = (
  <Link to="/" className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4">
    Back to the kitchen
  </Link>
);

export const LinkPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => formatCode(params.get('code') ?? ''));
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-counter">
        <Spinner />
      </div>
    );
  }

  // Sign in first, then come back here with the code
  if (!isAuthenticated) {
    rememberReturnPath(`${location.pathname}${location.search}`);
    return <Navigate to="/login" replace />;
  }

  const complete = code.replace('-', '').length === CODE_LENGTH;

  const answer = async (approve: boolean) => {
    setError('');
    setWorking(true);
    try {
      if (approve) await apiClient.approveDevice(code);
      else await apiClient.denyDevice(code);
      setOutcome(approve ? 'approved' : 'denied');
    } catch (err) {
      setError((err as { error?: string })?.error || 'That did not work. Check the code and try again.');
    } finally {
      setWorking(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (complete && !working) void answer(true);
  };

  if (outcome) {
    return (
      <AuthFrame title={outcome === 'approved' ? 'The TV is signed in' : 'Sign-in declined'} footer={backLink}>
        <p className="text-ink-2" role="status">
          {outcome === 'approved'
            ? 'The kitchen board shows on the TV within a few seconds.'
            : 'The TV was not signed in. If you did not ask for this code, nothing else is needed.'}
        </p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Sign in a TV" footer={backLink}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {error && <Notice>{error}</Notice>}

        <div>
          <label className="label" htmlFor="tv-code">
            Code on the TV
          </label>
          <input
            id="tv-code"
            className="field marker text-center text-3xl tracking-widest"
            value={code}
            onChange={(event) => setCode(formatCode(event.target.value))}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={CODE_LENGTH + 1}
            aria-describedby="tv-code-help"
          />
          <p id="tv-code-help" className="mt-2 text-sm text-ink-2">
            Approve only if this code is on your own TV right now. The TV then shows your kitchen and can change
            timers, dishes, and shopping lists as you.
          </p>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={!complete || working}>
          {working ? 'Signing in' : `Sign in the TV as ${user?.first_name ?? 'me'}`}
        </button>
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={!complete || working}
          onClick={() => void answer(false)}
        >
          This is not my TV
        </button>
      </form>
    </AuthFrame>
  );
};

export default LinkPage;
