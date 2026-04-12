import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NBAPlayer, PlayerStats } from '@/lib/types';
import { PlayerAvatar } from './PlayerAvatar';
import { motion } from 'framer-motion';

interface PlayerDetailModalProps {
  player: NBAPlayer | null;
  stats?: PlayerStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BigStat = ({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) => (
  <div className="text-center p-3 rounded-xl bg-muted/50">
    <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
      {value}
      {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
    </div>
    <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium mt-1">{label}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

export function PlayerDetailModal({ player, stats, open, onOpenChange }: PlayerDetailModalProps) {
  if (!player) return null;

  const draftInfo = player.draft_year
    ? `${player.draft_year} · Round ${player.draft_round}, Pick #${player.draft_number}`
    : 'Undrafted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div
          className="p-6 pb-4"
          style={{ background: `linear-gradient(135deg, ${player.team.color}18, ${player.team.secondaryColor}18)` }}
        >
          <div
            className="h-1.5 w-16 rounded-full mb-4"
            style={{ background: `linear-gradient(90deg, ${player.team.color}, ${player.team.secondaryColor})` }}
          />
          <DialogHeader>
            <div className="flex items-center gap-4">
              <PlayerAvatar player={player} size="lg" rounded="2xl" />
              <div>
                <DialogDescription className="text-xs font-semibold uppercase tracking-wider mb-0.5">
                  {player.team.full_name} · #{player.jersey_number}
                </DialogDescription>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {player.first_name} {player.last_name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {player.position} · {player.height} · {player.weight} lbs
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {stats && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-2">
              <BigStat label="PPG" value={stats.pts.toFixed(1)} />
              <BigStat label="RPG" value={stats.reb.toFixed(1)} />
              <BigStat label="APG" value={stats.ast.toFixed(1)} />
              <BigStat label="MIN" value={parseFloat(stats.min).toFixed(1)} />
            </motion.div>
          )}

          {stats && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Shooting</h4>
              <div className="grid grid-cols-3 gap-2">
                <BigStat label="FG%" value={(stats.fg_pct * 100).toFixed(1)} suffix="%" />
                <BigStat label="3PT%" value={(stats.fg3_pct * 100).toFixed(1)} suffix="%" />
                <BigStat label="FT%" value={(stats.ft_pct * 100).toFixed(1)} suffix="%" />
              </div>
            </motion.div>
          )}

          {stats && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-2">
              <BigStat label="STL" value={stats.stl.toFixed(1)} />
              <BigStat label="BLK" value={stats.blk.toFixed(1)} />
              <BigStat label="TO" value={stats.turnover.toFixed(1)} />
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border/60 p-4">
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Player Info</h4>
            <InfoRow label="Team Record" value={`${player.team.wins}W - ${player.team.losses}L`} />
            <InfoRow label="Games Played" value={stats ? String(stats.gp) : 'N/A'} />
            <InfoRow label="Draft" value={draftInfo} />
            <InfoRow label="College" value={player.college} />
            <InfoRow label="Country" value={player.country} />
            <InfoRow label="Career Teams" value={[...new Set(player.career_teams)].join(' → ')} />
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
