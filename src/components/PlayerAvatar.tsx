import { useState } from 'react';
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

function getHeadshotUrl(playerId: number) {
  return `https://cdn.nba.com/headshots/nba/latest/260x190/${playerId}.png`;
}

export function PlayerAvatar({ player, size = 'md', rounded = 'full', className = '' }: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = `${player.first_name[0]}${player.last_name[0]}`;
  const sizeClass = SIZES[size];
  const roundedClass = ROUNDED[rounded];

  if (imgError) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} flex items-center justify-center text-white font-bold shrink-0 ${className}`}
        style={{ backgroundColor: player.team.color }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} overflow-hidden shrink-0 flex items-center justify-center ${className}`}
      style={{ backgroundColor: player.team.color }}
    >
      <img
        src={getHeadshotUrl(player.id)}
        alt={`${player.first_name} ${player.last_name}`}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
