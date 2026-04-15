import { motion } from 'framer-motion';
import { NBAPlayer, PlayerStats } from '@/lib/types';
import { PlayerAvatar } from './PlayerAvatar';

interface PlayerCardProps {
  player: NBAPlayer;
  stats?: PlayerStats;
  onClick: (player: NBAPlayer) => void;
  index: number;
  teamRecord?: { wins: number; losses: number };
}

const StatBlock = ({ label, value }: { label: string; value: string | number }) => (
  <div className="text-center">
    <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
      {value}
    </div>
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
  </div>
);

export function PlayerCard({ player, stats, onClick, index, teamRecord }: PlayerCardProps) {

  return (
    <motion.div
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(player)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(player); } }}
      className="cursor-pointer group"
      aria-label={`${player.first_name} ${player.last_name}, ${player.position}, ${player.team.abbreviation}${stats ? `, ${stats.pts.toFixed(1)} PPG` : ''}`}
    >
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${player.team.color}, ${player.team.secondaryColor})` }}
        />

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <PlayerAvatar player={player} size="md" rounded="full" />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {player.team.abbreviation} · #{player.jersey_number}
                {teamRecord && <span className="normal-case"> · {teamRecord.wins}W-{teamRecord.losses}L</span>}
              </div>
              <div className="font-bold text-lg leading-tight truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {player.first_name} {player.last_name}
              </div>
              <div className="text-xs text-muted-foreground">{player.position} · {player.height}</div>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-1 pt-3 border-t border-border/50">
              <StatBlock label="PPG" value={stats.pts.toFixed(1)} />
              <StatBlock label="RPG" value={stats.reb.toFixed(1)} />
              <StatBlock label="APG" value={stats.ast.toFixed(1)} />
              <StatBlock label="MIN" value={parseFloat(stats.min).toFixed(1)} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
