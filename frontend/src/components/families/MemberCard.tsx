/**
 * MemberCard Component
 * Displays a family member with role and actions
 */

import type { FamilyMember } from '../../types';
import { FamilyRole } from '../../types';

interface MemberCardProps {
  member: FamilyMember;
  currentUserRole: string;
  currentUserId: number;
  onRemove?: (memberId: number) => void;
  onChangeRole?: (memberId: number, newRole: string) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  currentUserRole,
  currentUserId,
  onRemove,
  onChangeRole,
}) => {
  const isCurrentUser = member.user_id === currentUserId;
  const canManageMembers = currentUserRole === FamilyRole.OWNER || currentUserRole === FamilyRole.ADMIN;
  const canRemove = canManageMembers && !isCurrentUser;
  const canChangeRole = currentUserRole === FamilyRole.OWNER && !isCurrentUser;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case FamilyRole.OWNER:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case FamilyRole.ADMIN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
            {member.user?.first_name?.[0]}{member.user?.last_name?.[0]}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {member.user?.full_name}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
            )}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{member.user?.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canChangeRole ? (
          <select
            value={member.role}
            onChange={(e) => onChangeRole?.(member.id, e.target.value)}
            className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}
          >
            <option value={FamilyRole.MEMBER}>Member</option>
            <option value={FamilyRole.ADMIN}>Admin</option>
            <option value={FamilyRole.OWNER}>Owner</option>
          </select>
        ) : (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
            {member.role}
          </span>
        )}

        {canRemove && (
          <button
            onClick={() => onRemove?.(member.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded dark:text-red-400 dark:hover:bg-red-900/20"
            title="Remove member"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default MemberCard;
