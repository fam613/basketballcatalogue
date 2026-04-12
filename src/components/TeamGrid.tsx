import { motion } from 'framer-motion';
import { NBATeam, NBAPlayer } from '@/lib/types';
import { NBA_TEAMS, getPlayersForTeam } from '@/lib/nba-data';
import { PlayerCard } from './PlayerCard';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TeamGridProps {
  onPlayerClick: (player: NBAPlayer) => void;
  favTeamIds?: Set<number>;
  onToggleFavTeam?: (id: number) => void;
  teamRecords?: Record<number, { wins: number; losses: number }>;
}

function TeamTile({ team, onClick, isFav, onToggleFav }: { team: NBATeam; onClick: () => void; isFav?: boolean; onToggleFav?: () => void }) {
  const playerCount = getPlayersForTeam(team.abbreviation).length;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer relative"
    >
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${team.color}, ${team.secondaryColor})` }} />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-3"
              style={{ backgroundColor: team.color }}
            >
              {team.abbreviation}
            </div>
            {onToggleFav && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <Star className={`h-4 w-4 transition-colors ${isFav ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              </button>
            )}
          </div>
          <h3 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {team.full_name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-semibold" style={{ color: team.color }}>
              {team.wins}W - {team.losses}L
            </span>
            {playerCount > 0 && (
              <span className="text-xs text-muted-foreground">· {playerCount} players</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {team.conference} · {team.division}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function TeamGrid({ onPlayerClick, favTeamIds, onToggleFavTeam, teamRecords = {} }: TeamGridProps) {
  const [selectedTeam, setSelectedTeam] = useState<NBATeam | null>(null);

  const teamsWithRecords = NBA_TEAMS.map(t => {
    const rec = teamRecords[t.id];
    return rec ? { ...t, wins: rec.wins, losses: rec.losses } : t;
  });

  if (selectedTeam) {
    const players = getPlayersForTeam(selectedTeam.abbreviation);
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTeam(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: selectedTeam.color }}
          >
            {selectedTeam.abbreviation}
          </div>
          <div>
            <h2 className="font-bold text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {selectedTeam.full_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedTeam.wins}W - {selectedTeam.losses}L · {selectedTeam.conference} · {selectedTeam.division}
            </p>
          </div>
        </div>

        {players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((player, i) => (
              <PlayerCard key={player.id} player={player} onClick={onPlayerClick} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No players in our database for this team yet.</p>
        )}
      </div>
    );
  }

  const eastTeams = teamsWithRecords.filter(t => t.conference === 'East').sort((a, b) => b.wins - a.wins);
  const westTeams = teamsWithRecords.filter(t => t.conference === 'West').sort((a, b) => b.wins - a.wins);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-bold text-lg mb-4 text-muted-foreground uppercase tracking-widest text-xs">Eastern Conference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {eastTeams.map(team => (
            <TeamTile key={team.id} team={team} onClick={() => setSelectedTeam(team)} isFav={favTeamIds?.has(team.id)} onToggleFav={onToggleFavTeam ? () => onToggleFavTeam(team.id) : undefined} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-4 text-muted-foreground uppercase tracking-widest text-xs">Western Conference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {westTeams.map(team => (
            <TeamTile key={team.id} team={team} onClick={() => setSelectedTeam(team)} isFav={favTeamIds?.has(team.id)} onToggleFav={onToggleFavTeam ? () => onToggleFavTeam(team.id) : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
