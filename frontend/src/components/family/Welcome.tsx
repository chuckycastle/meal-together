/**
 * Welcome
 * First screen for an account that is not in a family yet. If a family
 * accepts requests, the person asks to join it and waits for approval.
 * Otherwise they start a family of their own.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Notice, Spinner } from '../kit';
import { FirstFamily } from '../plan/FirstFamily';
import { useAuth } from '../../contexts/AuthContext';
import { useFamilies } from '../../hooks/useFamilies';
import { useJoinStatus, useRequestToJoin, useWithdrawJoinRequest } from '../../hooks/useJoin';
import type { JoinableFamily, JoinRequest } from '../../types';

const POLL_MS = 8000;

const AskToJoin = ({ family }: { family: JoinableFamily }) => {
  const { user } = useAuth();
  const request = useRequestToJoin();
  const [note, setNote] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.mutate({ familyId: family.id, note: note.trim() });
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {request.isError && (
        <Notice>
          {(request.error as { error?: string })?.error ?? 'The request was not sent. Check your connection and try again.'}
        </Notice>
      )}
      <div>
        <label className="label" htmlFor="join-note">
          A note for the family, if they might not know your email
        </label>
        <input
          id="join-note"
          className="field"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={`It's ${user?.first_name ?? 'me'}, bringing the pies`}
          maxLength={280}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={request.isPending}>
        Ask to join {family.name}
      </button>
    </form>
  );
};

const Waiting = ({ request }: { request: JoinRequest }) => {
  const withdraw = useWithdrawJoinRequest();

  return (
    <div className="mt-6">
      <div className="sheet px-5 py-5">
        <p className="marker text-2xl">Waiting for {request.family_name}</p>
        <p className="mt-2 text-ink-2">
          Your request is with the family. Once someone approves it, this page opens the kitchen on its own. You can
          leave it open or come back later.
        </p>
        {request.note && <p className="mt-3 text-sm text-ink-2">Your note: "{request.note}"</p>}
      </div>
      {withdraw.isError && (
        <div className="mt-3">
          <Notice>The request was not withdrawn. Try again.</Notice>
        </div>
      )}
      <button
        type="button"
        className="btn btn-quiet btn-sm mt-3"
        onClick={() => withdraw.mutate(request.id)}
        disabled={withdraw.isPending}
      >
        Withdraw the request
      </button>
    </div>
  );
};

export const Welcome = () => {
  const { user, logout } = useAuth();
  const { data: status, isLoading, isError } = useJoinStatus(true, POLL_MS);
  const pending = status?.requests.find((request) => request.status === 'pending');
  // While a request is open, watch for the approval
  useFamilies(true, pending ? POLL_MS : undefined);

  if (isLoading) return <Spinner />;
  if (isError || !status) {
    return <Notice>This page did not load. Check your connection and reload.</Notice>;
  }

  const declined = status.requests.find((request) => request.status === 'declined');
  const family = status.families[0];

  // No family is taking requests: this account starts one
  if (!pending && !declined && !family) return <FirstFamily />;

  return (
    <div className="mx-auto max-w-lg pt-8">
      <h1 className="marker text-4xl">Welcome, {user?.first_name}</h1>

      {pending ? (
        <Waiting request={pending} />
      ) : declined ? (
        <div className="mt-6">
          <Notice tone="info">
            Your request to join {declined.family_name} was declined. If that was a mistake, ask someone in the family
            to add you by email ({user?.email}) from their Family page.
          </Notice>
        </div>
      ) : (
        <>
          <p className="mt-2 text-ink-2">
            Recipes, shopping, timers, and the cooking schedule are shared with a family. Ask to join {family.name} and
            someone there will approve you.
          </p>
          <AskToJoin family={family} />
        </>
      )}

      <p className="mt-10 text-sm text-ink-2">
        Signed in as {user?.email}.{' '}
        <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => logout()}>
          Use a different account
        </button>
      </p>
    </div>
  );
};
