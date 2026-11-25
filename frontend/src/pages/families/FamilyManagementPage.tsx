/**
 * Family Management Page
 * Who is in the family, who is asking to join, and what each person can do
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserMinus } from 'lucide-react';
import { Layout } from '../../components/layout';
import { Avatar, BlankSlate, Dialog, Notice, PageHeader, Spinner } from '../../components/kit';
import { JoinRequests } from '../../components/family/JoinRequests';
import { useFamily } from '../../contexts/FamilyContext';
import {
  useAddMember,
  useCreateFamily,
  useLeaveFamily,
  useRemoveMember,
  useUpdateFamily,
  useUpdateMemberRole,
} from '../../hooks/useFamilies';
import { useJoinRequests } from '../../hooks/useJoin';
import { useMe } from '../../hooks/useMe';
import type { Family, FamilyMember } from '../../types';

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Organizer', member: 'Member' };

const errorText = (error: unknown, fallback: string) => (error as { error?: string })?.error ?? fallback;

const NameDialog = ({ family, onClose }: { family?: Family; onClose: (created?: Family) => void }) => {
  const update = useUpdateFamily(family?.id ?? 0);
  const create = useCreateFamily();
  const [name, setName] = useState(family?.name ?? '');
  const [error, setError] = useState('');
  const saving = update.isPending || create.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Give the family a name.');
    setError('');
    try {
      if (family) {
        await update.mutateAsync({ name: name.trim() });
        onClose();
      } else {
        onClose(await create.mutateAsync({ name: name.trim() }));
      }
    } catch (caught) {
      setError(errorText(caught, 'The name was not saved. Try again.'));
    }
  };

  return (
    <Dialog
      open
      onClose={() => onClose()}
      title={family ? 'Rename family' : 'Start another family'}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={() => onClose()}>
            Cancel
          </button>
          <button type="submit" form="family-name-form" className="btn btn-primary" disabled={saving}>
            {family ? 'Save name' : 'Create family'}
          </button>
        </>
      }
    >
      <form id="family-name-form" onSubmit={submit} className="space-y-4">
        {error && <Notice>{error}</Notice>}
        <div>
          <label className="label" htmlFor="family-name-input">
            Family name
          </label>
          <input
            id="family-name-input"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            autoFocus
          />
        </div>
        {!family && (
          <p className="text-sm text-ink-2">
            A new family starts empty, with its own recipes, meals, and shopping list. Switch between families from
            the account menu.
          </p>
        )}
      </form>
    </Dialog>
  );
};

const AddByEmail = ({ familyId }: { familyId: number }) => {
  const addMember = useAddMember(familyId);
  const [email, setEmail] = useState('');
  const [added, setAdded] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setAdded('');
    try {
      await addMember.mutateAsync({ email: address });
      setAdded(address);
      setEmail('');
    } catch {
      // The message below reads the mutation error
    }
  };

  return (
    <form onSubmit={submit} className="mt-4">
      <label className="label" htmlFor="add-email">
        Add someone who already has an account
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="add-email"
          type="email"
          className="field min-w-0 flex-1 basis-56"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="their email"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-outline" disabled={addMember.isPending || !email.trim()}>
          Add to family
        </button>
      </div>
      {addMember.isError && (
        <p className="mt-2 text-sm text-hot" role="alert">
          {errorText(addMember.error, 'They were not added. Try again.') === 'User not found'
            ? 'No account uses that email yet. They need to create one first.'
            : errorText(addMember.error, 'They were not added. Try again.')}
        </p>
      )}
      {added && !addMember.isError && (
        <p className="mt-2 text-sm text-ink-2" role="status">
          Added {added}.
        </p>
      )}
    </form>
  );
};

interface MemberRowProps {
  member: FamilyMember;
  familyId: number;
  isMe: boolean;
  canManage: boolean;
  isOwner: boolean;
}

const MemberRow = ({ member, familyId, isMe, canManage, isOwner }: MemberRowProps) => {
  const changeRole = useUpdateMemberRole(familyId);
  const remove = useRemoveMember(familyId);
  const person = member.user;
  const name = person ? `${person.first_name} ${person.last_name}` : `Member ${member.user_id}`;
  const canChangeRole = isOwner && member.role !== 'owner';
  const canRemove = canManage && !isMe && member.role !== 'owner';

  const handleRemove = () => {
    if (window.confirm(`Remove ${name} from the family? Their dishes and recipes lose their cook.`)) {
      remove.mutate(member.id);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
      {person && <Avatar user={person} />}
      <div className="min-w-0 flex-1 basis-40 leading-snug">
        <p className="font-semibold">
          {name}
          {isMe && <span className="ml-2 text-sm font-normal text-ink-2">you</span>}
        </p>
        <p className="truncate text-sm text-ink-2">{person?.email}</p>
        {(changeRole.isError || remove.isError) && (
          <p className="text-sm text-hot" role="alert">
            That did not go through. Try again.
          </p>
        )}
      </div>
      {canChangeRole ? (
        <select
          className="field w-auto min-h-0 py-1.5 text-sm"
          value={member.role}
          aria-label={`Role for ${name}`}
          disabled={changeRole.isPending}
          onChange={(event) =>
            changeRole.mutate({ memberId: member.id, role: event.target.value as 'admin' | 'member' })
          }
        >
          <option value="member">Member</option>
          <option value="admin">Organizer</option>
        </select>
      ) : (
        <span className="rounded-full border-[1.5px] border-line px-3 py-1 text-sm font-semibold">
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      )}
      {canRemove && (
        <button
          type="button"
          className="btn btn-quiet btn-icon btn-sm"
          onClick={handleRemove}
          disabled={remove.isPending}
          aria-label={`Remove ${name}`}
        >
          <UserMinus size={18} aria-hidden="true" />
        </button>
      )}
    </li>
  );
};

export const FamilyManagementPage = () => {
  const navigate = useNavigate();
  const { families, setActiveFamily, isLoading } = useFamily();
  const { family, members, userId, role, canManage, isOwner } = useMe();
  const { data: requests = [] } = useJoinRequests(family?.id, canManage);
  const updateFamily = useUpdateFamily(family?.id ?? 0);
  const leaveFamily = useLeaveFamily();
  const [naming, setNaming] = useState<'rename' | 'new' | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (!family) {
    return (
      <Layout>
        <BlankSlate
          title="You are not in a family yet"
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
              Go to the kitchen
            </button>
          }
        >
          Ask to join one from the kitchen page.
        </BlankSlate>
      </Layout>
    );
  }

  const handleLeave = async () => {
    if (!window.confirm(`Leave ${family.name}? You lose access to its recipes, meals, and shopping list.`)) return;
    try {
      await leaveFamily.mutateAsync(family.id);
      setActiveFamily(families.find((candidate) => candidate.id !== family.id) ?? null);
      navigate('/');
    } catch {
      // The notice below reads the mutation error
    }
  };

  return (
    <Layout>
      <PageHeader
        title={family.name}
        description={`${members.length} ${members.length === 1 ? 'person' : 'people'}. You are ${
          role === 'owner' ? 'the owner' : role === 'admin' ? 'an organizer' : 'a member'
        }.`}
        actions={
          canManage && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setNaming('rename')}>
              <Pencil size={16} aria-hidden="true" />
              Rename
            </button>
          )
        }
      />

      <div className="space-y-10">
        {canManage && requests.length > 0 && (
          <section aria-labelledby="requests-heading">
            <h2 id="requests-heading" className="marker mb-2 flex items-baseline gap-2 text-2xl">
              Asking to join
              <span className="rounded-full bg-hot px-2 py-0.5 font-sans text-sm font-bold text-on-hot">
                {requests.length}
              </span>
            </h2>
            <JoinRequests familyId={family.id} requests={requests} />
          </section>
        )}

        <section aria-labelledby="members-heading">
          <h2 id="members-heading" className="marker mb-2 text-2xl">
            In the family
          </h2>
          <ul className="surface divide-y divide-line">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                familyId={family.id}
                isMe={member.user_id === userId}
                canManage={canManage}
                isOwner={isOwner}
              />
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-2">
            Organizers can approve requests, add and remove people, and rename the family. Everyone can edit recipes,
            the plan, shopping, and timers.
          </p>
          {canManage && <AddByEmail familyId={family.id} />}
        </section>

        {canManage && (
          <section aria-labelledby="joining-heading">
            <h2 id="joining-heading" className="marker mb-2 text-2xl">
              New accounts
            </h2>
            <label className="surface flex cursor-pointer items-start gap-3 px-4 py-4 sm:px-5">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-[var(--ink)]"
                checked={!!family.accepts_join_requests}
                disabled={updateFamily.isPending}
                onChange={(event) => updateFamily.mutate({ accepts_join_requests: event.target.checked })}
              />
              <span className="leading-snug">
                <span className="block font-semibold">Let new accounts ask to join {family.name}</span>
                <span className="block text-sm text-ink-2">
                  Share {window.location.host}. Someone who creates an account there sees a button to ask to join. They
                  see nothing in the family until an owner or organizer approves them.
                </span>
              </span>
            </label>
            {updateFamily.isError && (
              <p className="mt-2 text-sm text-hot" role="alert">
                The setting was not saved. Try again.
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="other-heading" className="border-t border-line pt-6">
          <h2 id="other-heading" className="sr-only">
            Other actions
          </h2>
          {leaveFamily.isError && (
            <div className="mb-3">
              <Notice>{errorText(leaveFamily.error, 'You were not removed. Try again.')}</Notice>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!isOwner && (
              <button type="button" className="btn btn-danger" onClick={handleLeave} disabled={leaveFamily.isPending}>
                Leave {family.name}
              </button>
            )}
            <button type="button" className="btn btn-quiet" onClick={() => setNaming('new')}>
              Start another family
            </button>
          </div>
        </section>
      </div>

      {naming && (
        <NameDialog
          family={naming === 'rename' ? family : undefined}
          onClose={(created) => {
            setNaming(null);
            if (created) {
              setActiveFamily(created);
              navigate('/');
            }
          }}
        />
      )}
    </Layout>
  );
};

export default FamilyManagementPage;
