import { useState, useMemo } from 'react';
import { Search, LayoutGrid, Building2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { TeamGrid } from '@/components/TeamGrid';
import { usePlayersQuery, usePlayerStatsQuery } from '@/hooks/use-nba-data';
import { NBAPlayer, ViewMode, PositionFilter } from '@/lib/types';
import { searchPlayers, filterByPosition } from '@/lib/nba-data';
import { motion, AnimatePresence } from 'framer-motion';

const POSITIONS: PositionFilter[] = ['ALL', 'G', 'F', 'C'];

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<NBAPlayer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: players = [], isFetching: playersFetching } = usePlayersQuery();
  const playerIds = useMemo(() => players.map(p => p.id), [players]);
  const { data: statsMap = {}, isFetching: statsFetching } = usePlayerStatsQuery(playerIds);

  const isFetching = playersFetching || statsFetching;

  const filteredPlayers = useMemo(() => {
    let result = searchQuery
      ? players.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.team.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.team.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [...players];
    if (positionFilter !== 'ALL') {
      result = result.filter(p => p.position.includes(positionFilter.charAt(0)));
    }
    return result;
  }, [players, searchQuery, positionFilter]);

  const handlePlayerClick = (player: NBAPlayer) => {
    setSelectedPlayer(player);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-primary-foreground text-lg font-bold">🏀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  NBA Cards
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {players.length} Active Players
                  {isFetching && (
                    <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-3 sm:justify-end">
              {viewMode === 'grid' && (
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players or teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              )}

              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" /> Cards
                </button>
                <button
                  onClick={() => setViewMode('teams')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" /> Teams
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' && (
            <div className="flex gap-2 mt-3">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    positionFilter === pos
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {pos === 'ALL' ? 'All' : pos === 'G' ? 'Guards' : pos === 'F' ? 'Forwards' : 'Centers'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPlayers.map((player, i) => (
                    <PlayerCard key={player.id} player={player} stats={statsMap[player.id]} onClick={handlePlayerClick} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No players found</p>
                  <p className="text-muted-foreground text-sm mt-1">Try a different search or filter</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="teams"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TeamGrid onPlayerClick={handlePlayerClick} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PlayerDetailModal
        player={selectedPlayer}
        stats={selectedPlayer ? statsMap[selectedPlayer.id] : undefined}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};

export default Index;
