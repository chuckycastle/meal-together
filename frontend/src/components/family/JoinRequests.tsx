/**
 * JoinRequests
 * People asking to join the family, with approve and decline.
 * Shown to owners and organizers.
 */

import { useState } from 'react';
import { Avatar, Notice } from '../kit';
import { useDecideJoinRequest } from '../../hooks/useJoin';
import type { JoinRequest } from '../../types';

interface JoinRequestsProps {
  familyId: number;
  requests: JoinRequest[];
  /** Tighter layout for the side column */
  compact?: boolean;
}

export const JoinRequests = ({ familyId, requests, compact = false }: JoinRequestsProps) => {
  const decide = useDecideJoinRequest(familyId);
  const [organizers, setOrganizers] = useState<Record<number, boolean>>({});

  if (requests.length === 0) return null;

  return (
    <div>
      {decide.isError && (
        <div className="mb-3">
          <Notice>That did not go through. Check your connection and try again.</Notice>
        </div>
      )}
      <ul className={compact ? 'divide-y divide-line' : 'surface divide-y divide-line'}>
        {requests.map((request) => {
          const person = request.user;
          const name = person ? `${person.first_name} ${person.last_name}` : 'Someone';
          const busy = decide.isPending && decide.variables?.requestId === request.id;

          return (
            <li key={request.id} className={compact ? 'py-3' : 'px-4 py-4 sm:px-5'}>
              <div className="flex items-start gap-3">
                {person && <Avatar user={person} size={compact ? 'sm' : 'md'} className="mt-0.5" />}
                <div className="min-w-0 flex-1 leading-snug">
                  <p className="font-semibold">{name}</p>
                  <p className="truncate text-sm text-ink-2">{person?.email}</p>
                  {request.note && <p className="mt-1 text-sm">"{request.note}"</p>}
                </div>
              </div>
              <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${compact ? '' : 'sm:pl-12'}`}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={() =>
                    decide.mutate({ requestId: request.id, decision: organizers[request.id] ? 'admin' : 'member' })
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy}
                  onClick={() => decide.mutate({ requestId: request.id, decision: 'decline' })}
                >
                  Decline
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--ink)]"
                    checked={!!organizers[request.id]}
                    onChange={(event) => setOrganizers((state) => ({ ...state, [request.id]: event.target.checked }))}
                  />
                  Can also approve others
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
