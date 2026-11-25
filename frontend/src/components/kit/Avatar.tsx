/**
 * Avatar
 * Initials of a family member
 */

import type { User } from '../../types';

interface AvatarProps {
  user: Pick<User, 'first_name' | 'last_name'>;
  size?: 'sm' | 'md';
  className?: string;
}

export const Avatar = ({ user, size = 'md', className = '' }: AvatarProps) => {
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
  const dimensions = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

  return (
    <span
      title={`${user.first_name} ${user.last_name}`}
      className={`inline-grid flex-none place-items-center rounded-full border-[1.5px] border-ink bg-paper font-bold text-ink ${dimensions} ${className}`}
    >
      <span aria-hidden="true">{initials}</span>
      <span className="sr-only">
        {user.first_name} {user.last_name}
      </span>
    </span>
  );
};
