import { NBA_TEAMS } from '@/lib/nba-data';
import { NBATeam } from '@/lib/types';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StandingsViewProps {
  favTeamIds?: Set<number>;
  onToggleFavTeam?: (id: number) => void;
  teamRecords?: Record<number, { wins: number; losses: number }>;
}

function pct(w: number, l: number) {
  return w + l > 0 ? (w / (w + l)).toFixed(3).replace(/^0/, '') : '.000';
}

function gb(leader: NBATeam, team: NBATeam) {
  const diff = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
  if (!Number.isFinite(diff) || diff === 0) return '—';
  return diff.toFixed(1);
}

function ConferenceTable({ title, teams, favTeamIds, onToggleFavTeam }: { title: string; teams: NBATeam[]; favTeamIds?: Set<number>; onToggleFavTeam?: (id: number) => void }) {
  const leader = teams[0];

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</h2>
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left py-2.5 px-3 sm:px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider w-8">#</th>
              <th className="text-left py-2.5 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Team</th>
              <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">W</th>
              <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">L</th>
              <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">PCT</th>
              <th className="text-center py-2.5 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">GB</th>
              {onToggleFavTeam && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => {
              const isFav = favTeamIds?.has(team.id);
              const isPlayoff = i < 6;
              const isPlayIn = i >= 6 && i < 10;

              return (
                <motion.tr
                  key={team.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20 ${
                    isPlayoff ? '' : isPlayIn ? 'opacity-80' : 'opacity-50'
                  }`}
                >
                  <td className="py-2.5 px-3 sm:px-4 tabular-nums text-muted-foreground font-medium">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.abbreviation}
                      </div>
                      <span className="font-semibold whitespace-nowrap" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {team.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums font-semibold">{team.wins}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-muted-foreground">{team.losses}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums font-medium">{pct(team.wins, team.losses)}</td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-muted-foreground">{gb(leader, team)}</td>
                  {onToggleFavTeam && (
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => onToggleFavTeam(team.id)}
                        className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        <Star className={`h-4 w-4 transition-colors ${isFav ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/40'}`} />
                      </button>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex gap-4 text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>1–6 Playoff</span>
          <span>7–10 Play-In</span>
        </div>
      </div>
    </div>
  );
}

export function StandingsView({ favTeamIds, onToggleFavTeam, teamRecords = {} }: StandingsViewProps) {
  const teamsWithRecords = NBA_TEAMS.map(t => {
    const rec = teamRecords[t.id];
    return rec ? { ...t, wins: rec.wins, losses: rec.losses } : t;
  });

  const east = teamsWithRecords.filter(t => t.conference === 'East').sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const west = teamsWithRecords.filter(t => t.conference === 'West').sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ConferenceTable title="Eastern Conference" teams={east} favTeamIds={favTeamIds} onToggleFavTeam={onToggleFavTeam} />
      <ConferenceTable title="Western Conference" teams={west} favTeamIds={favTeamIds} onToggleFavTeam={onToggleFavTeam} />
    </div>
  );
}
