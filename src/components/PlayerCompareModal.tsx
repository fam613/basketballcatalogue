import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NBAPlayer, PlayerStats } from '@/lib/types';
import { PlayerAvatar } from './PlayerAvatar';
import { motion } from 'framer-motion';

interface PlayerCompareModalProps {
  players: [NBAPlayer, NBAPlayer];
  stats: [PlayerStats | undefined, PlayerStats | undefined];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAT_ROWS: { key: keyof PlayerStats; label: string; format?: 'pct' }[] = [
  { key: 'pts', label: 'PPG' },
  { key: 'reb', label: 'RPG' },
  { key: 'ast', label: 'APG' },
  { key: 'stl', label: 'STL' },
  { key: 'blk', label: 'BLK' },
  { key: 'gp', label: 'GP' },
  { key: 'fg_pct', label: 'FG%', format: 'pct' },
  { key: 'fg3_pct', label: '3PT%', format: 'pct' },
  { key: 'ft_pct', label: 'FT%', format: 'pct' },
  { key: 'turnover', label: 'TO' },
];

function formatVal(val: number, format?: 'pct') {
  if (format === 'pct') return (val * 100).toFixed(1) + '%';
  return val.toFixed(1);
}

function CompareBar({ left, right, label, format }: { left: number; right: number; label: string; format?: 'pct' }) {
  const max = Math.max(left, right, 0.1);
  const leftPct = (left / max) * 100;
  const rightPct = (right / max) * 100;
  const leftWins = left > right;
  const rightWins = right > left;
  // For turnovers, lower is better
  const invertWinner = label === 'TO';
  const leftBetter = invertWinner ? left < right : leftWins;
  const rightBetter = invertWinner ? right < left : rightWins;

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-bold tabular-nums ${leftBetter ? 'text-primary' : 'text-foreground'}`}>
          {formatVal(left, format)}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${rightBetter ? 'text-primary' : 'text-foreground'}`}>
          {formatVal(right, format)}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${leftPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-l-full ${leftBetter ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        </div>
        <div className="flex-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rightPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-r-full ${rightBetter ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerHeader({ player }: { player: NBAPlayer }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <PlayerAvatar player={player} size="lg" rounded="2xl" />
      <div>
        <div className="font-bold text-sm leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {player.first_name} {player.last_name}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {player.team.abbreviation} · {player.position}
        </div>
      </div>
    </div>
  );
}

export function PlayerCompareModal({ players, stats, open, onOpenChange }: PlayerCompareModalProps) {
  const [p1, p2] = players;
  const [s1, s2] = stats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0">
        <div className="p-4 sm:p-6 pb-3">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Player Comparison
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Side-by-side stat breakdown
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between mt-4 px-0 sm:px-4 gap-2">
            <PlayerHeader player={p1} />
            <div className="flex items-center shrink-0">
              <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">VS</span>
            </div>
            <PlayerHeader player={p2} />
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-6">
          {s1 && s2 ? (
            <div className="space-y-1">
              {STAT_ROWS.map((row) => (
                <CompareBar
                  key={row.key}
                  left={Number(s1[row.key])}
                  right={Number(s2[row.key])}
                  label={row.label}
                  format={row.format}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              Stats unavailable for one or both players
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
