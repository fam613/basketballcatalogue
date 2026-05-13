import { useState } from 'react';
import { PlayoffSeries } from '@/lib/types';
import { NBA_TEAMS } from '@/lib/nba-data';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Trophy, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlayoffsViewProps {
  series: PlayoffSeries[];
  isLoading: boolean;
}

function getTeamColor(teamId: number): string {
  return NBA_TEAMS.find(t => t.id === teamId)?.color ?? '#333'
}

function SeriesCard({ series }: { series: PlayoffSeries }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = series.status === 'completed';
  const team1Leading = series.team1Wins > series.team2Wins;
  const team2Leading = series.team2Wins > series.team1Wins;
  const isTied = series.team1Wins === series.team2Wins;

  const today = new Date().toISOString().split('T')[0];
  const hasGameToday = series.games.some(g => g.date?.startsWith(today) && g.status !== 'Final');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 overflow-hidden bg-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
        aria-label={`${series.team1Name} vs ${series.team2Name} series details`}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: getTeamColor(series.team1Id) }}>{series.team1Abbr}</div>
              <span className={`text-sm font-semibold flex-1 ${isComplete && series.winnerId === series.team1Id ? '' : isComplete ? 'text-muted-foreground' : ''}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{series.team1Name}</span>
              <span className={`text-lg font-bold tabular-nums ${team1Leading ? 'text-foreground' : 'text-muted-foreground'}`}>{series.team1Wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: getTeamColor(series.team2Id) }}>{series.team2Abbr}</div>
              <span className={`text-sm font-semibold flex-1 ${isComplete && series.winnerId === series.team2Id ? '' : isComplete ? 'text-muted-foreground' : ''}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{series.team2Name}</span>
              <span className={`text-lg font-bold tabular-nums ${team2Leading ? 'text-foreground' : 'text-muted-foreground'}`}>{series.team2Wins}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 ml-3">
            {isComplete && <Trophy className="h-4 w-4 text-yellow-500" />}
            {hasGameToday && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase"><Circle className="h-2 w-2 fill-green-500 animate-pulse" />Today</span>}
            {!isComplete && !hasGameToday && <span className="text-[10px] text-muted-foreground uppercase font-semibold">{isTied ? 'Tied' : team1Leading ? `${series.team1Abbr} leads` : `${series.team2Abbr} leads`}</span>}
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>
      {expanded && series.games.length > 0 && (
        <div className="border-t border-border/40 bg-muted/10">
          {series.games.map((game, i) => {
            const homeWon = game.status === 'Final' && game.home_team_score > game.visitor_team_score;
            const visitorWon = game.status === 'Final' && game.visitor_team_score > game.home_team_score;
            const isToday = game.date?.startsWith(today);
            const isFinal = game.status === 'Final';
            return (
              <div key={game.id} className={`flex items-center justify-between px-4 py-2 text-xs border-b border-border/20 last:border-0 ${isToday && !isFinal ? 'bg-green-500/5' : ''}`}>
                <span className="text-muted-foreground font-medium w-16">Game {i + 1}</span>
                <div className="flex-1 flex items-center justify-center gap-2">
                  <span className={`font-semibold ${visitorWon ? '' : isFinal ? 'text-muted-foreground' : ''}`}>{game.visitor_team.abbreviation}</span>
                  {isFinal ? <span className="tabular-nums font-bold">{game.visitor_team_score} - {game.home_team_score}</span> : isToday ? <span className="text-green-500 font-bold">TONIGHT</span> : <span className="text-muted-foreground">vs</span>}
                  <span className={`font-semibold ${homeWon ? '' : isFinal ? 'text-muted-foreground' : ''}`}>{game.home_team.abbreviation}</span>
                </div>
                <span className="text-muted-foreground w-16 text-right">{isFinal ? 'Final' : isToday ? 'Live' : game.date?.slice(5, 10) ?? ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function PlayoffsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[0, 1].map(col => (<div key={col} className="space-y-3"><Skeleton className="h-4 w-40 mb-2" />{[0, 1, 2, 3].map(i => (<Skeleton key={i} className="h-24 w-full rounded-xl" />))}</div>))}
    </div>
  );
}

export function PlayoffsView({ series, isLoading }: PlayoffsViewProps) {
  if (isLoading) return <PlayoffsSkeleton />;
  if (series.length === 0) {
    return (
      <div className="text-center py-20">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">No playoff games yet</p>
        <p className="text-muted-foreground text-sm mt-1">Playoff data will appear here once the postseason begins</p>
      </div>
    );
  }
  const westSeries = series.filter(s => s.conference === 'West');
  const eastSeries = series.filter(s => s.conference === 'East');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Western Conference</h2>
          <div className="space-y-3">
            {westSeries.map(s => (<SeriesCard key={`${s.team1Id}-${s.team2Id}`} series={s} />))}
            {westSeries.length === 0 && <p className="text-sm text-muted-foreground py-4">No Western Conference playoff games</p>}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Eastern Conference</h2>
          <div className="space-y-3">
            {eastSeries.map(s => (<SeriesCard key={`${s.team1Id}-${s.team2Id}`} series={s} />))}
            {eastSeries.length === 0 && <p className="text-sm text-muted-foreground py-4">No Eastern Conference playoff games</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
