import { motion } from 'framer-motion';
import { NBATeam, NBAPlayer } from '@/lib/types';
import { NBA_TEAMS } from '@/lib/nba-data';
import { PlayerCard } from './PlayerCard';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TeamGridProps {
  players: NBAPlayer[];
  onPlayerClick: (player: NBAPlayer) => void;
  favTeamIds?: Set<number>;
  onToggleFavTeam?: (id: number) => void;
  teamRecords?: Record<number, { wins: number; losses: number }>;
  compareMode?: boolean;
  compareSlots?: [NBAPlayer | null, NBAPlayer | null];
}

function TeamTile({ team, playerCount, onClick, isFav, onToggleFav }: { team: NBATeam; playerCount: number; onClick: () => void; isFav?: boolean; onToggleFav?: () => void }) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="cursor-pointer relative"
      aria-label={`${team.full_name}, ${team.wins}W-${team.losses}L`}
    >
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${team.color}, ${team.secondaryColor})` }} />
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-3" style={{ backgroundColor: team.color }}>
              {team.abbreviation}
            </div>
            {onToggleFav && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                className="p-2 rounded-full hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -m-1"
                aria-label={`${isFav ? 'Remove' : 'Add'} ${team.full_name} ${isFav ? 'from' : 'to'} favorites`}
                aria-pressed={isFav}
              >
                <Star className={`h-4 w-4 transition-colors ${isFav ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} aria-hidden="true" />
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

export function TeamGrid({ players, onPlayerClick, favTeamIds, onToggleFavTeam, teamRecords = {}, compareMode = false, compareSlots = [null, null] }: TeamGridProps) {
  const [selectedTeam, setSelectedTeam] = useState<NBATeam | null>(null);

  const teamsWithRecords = NBA_TEAMS.map(t => {
    const rec = teamRecords[t.id];
    return rec ? { ...t, wins: rec.wins, losses: rec.losses } : t;
  });

  if (selectedTeam) {
    const teamPlayers = players.filter(p => p.team.abbreviation === selectedTeam.abbreviation);
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTeam(null)} aria-label="Back to all teams">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: selectedTeam.color }}>
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

        {teamPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamPlayers.map((player, i) => {
              const isSelected = compareMode && (compareSlots[0]?.id === player.id || compareSlots[1]?.id === player.id);
              return (
                <div key={player.id} className={`relative ${isSelected ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
                  <PlayerCard player={player} onClick={onPlayerClick} index={i} />
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10">
                      {compareSlots[0]?.id === player.id ? '1' : '2'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">No players in our database for this team yet.</p>
        )}
      </div>
    );
  }

  const playerCountByTeam: Record<string, number> = {};
  for (const p of players) {
    playerCountByTeam[p.team.abbreviation] = (playerCountByTeam[p.team.abbreviation] || 0) + 1;
  }

  const eastTeams = teamsWithRecords.filter(t => t.conference === 'East').sort((a, b) => b.wins - a.wins);
  const westTeams = teamsWithRecords.filter(t => t.conference === 'West').sort((a, b) => b.wins - a.wins);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-bold text-lg mb-4 text-muted-foreground uppercase tracking-widest text-xs">Eastern Conference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {eastTeams.map(team => (
            <TeamTile key={team.id} team={team} playerCount={playerCountByTeam[team.abbreviation] || 0} onClick={() => setSelectedTeam(team)} isFav={favTeamIds?.has(team.id)} onToggleFav={onToggleFavTeam ? () => onToggleFavTeam(team.id) : undefined} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-4 text-muted-foreground uppercase tracking-widest text-xs">Western Conference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {westTeams.map(team => (
            <TeamTile key={team.id} team={team} playerCount={playerCountByTeam[team.abbreviation] || 0} onClick={() => setSelectedTeam(team)} isFav={favTeamIds?.has(team.id)} onToggleFav={onToggleFavTeam ? () => onToggleFavTeam(team.id) : undefined} />
          ))}
        </div>
      </div>
    </div>
  );
}
