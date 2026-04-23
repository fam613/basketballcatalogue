import { NBAPlayer } from '@/lib/types';

interface PlayerAvatarProps {
  player: NBAPlayer;
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'full' | 'xl' | '2xl';
  className?: string;
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-2xl',
};

const ROUNDED = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export function PlayerAvatar({ player, size = 'md', rounded = 'full', className = '' }: PlayerAvatarProps) {
  const initials = `${player.first_name?.[0] ?? '?'}${player.last_name?.[0] ?? '?'}`;
  const sizeClass = SIZES[size];
  const roundedClass = ROUNDED[rounded];

  return (
    <div
      className={`${sizeClass} ${roundedClass} flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ backgroundColor: player.team.color }}
    >
      {initials}
    </div>
  );
}
