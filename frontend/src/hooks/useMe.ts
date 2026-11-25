/**
 * useMe
 * The signed-in person in the context of the active family:
 * who they are, their role, and whether they can approve and manage members.
 */

import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';

export const useMe = () => {
  const { user } = useAuth();
  const { activeFamily } = useFamily();

  const membership = activeFamily?.members?.find((member) => member.user_id === user?.id);
  const role = membership?.role ?? null;

  return {
    user,
    userId: user?.id ?? 0,
    family: activeFamily,
    members: activeFamily?.members ?? [],
    role,
    /** Owners and organizers approve requests and manage members */
    canManage: role === 'owner' || role === 'admin',
    isOwner: role === 'owner',
  };
};
