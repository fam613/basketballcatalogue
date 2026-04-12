import { useState, useMemo } from 'react';
import { Search, LayoutGrid, Building2, RefreshCw, GitCompareArrows, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { PlayerCompareModal } from '@/components/PlayerCompareModal';
import { TeamGrid } from '@/components/TeamGrid';
import { usePlayersQuery, usePlayerStatsQuery } from '@/hooks/use-nba-data';
import { NBAPlayer, ViewMode, PositionFilter } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const POSITIONS: PositionFilter[] = ['ALL', 'G', 'F', 'C'];

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<NBAPlayer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlots, setCompareSlots] = useState<[NBAPlayer | null, NBAPlayer | null]>([null, null]);
  const [compareOpen, setCompareOpen] = useState(false);

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
    if (compareMode) {
      // If already selected, deselect
      if (compareSlots[0]?.id === player.id) {
        setCompareSlots([null, compareSlots[1]]);
        return;
      }
      if (compareSlots[1]?.id === player.id) {
        setCompareSlots([compareSlots[0], null]);
        return;
      }
      // Fill first empty slot
      if (!compareSlots[0]) {
        setCompareSlots([player, compareSlots[1]]);
      } else if (!compareSlots[1]) {
        setCompareSlots([compareSlots[0], player]);
      } else {
        // Both full — replace second
        setCompareSlots([compareSlots[0], player]);
      }
      return;
    }
    setSelectedPlayer(player);
    setModalOpen(true);
  };

  const isSelected = (id: number) => compareMode && (compareSlots[0]?.id === id || compareSlots[1]?.id === id);
  const selectedCount = [compareSlots[0], compareSlots[1]].filter(Boolean).length;

  const exitCompare = () => {
    setCompareMode(false);
    setCompareSlots([null, null]);
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
              {viewMode === 'grid' && !compareMode && (
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

              {viewMode === 'grid' && (
                <button
                  onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
                    compareMode
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <GitCompareArrows className="h-4 w-4" />
                  {compareMode ? 'Exit Compare' : 'Compare'}
                </button>
              )}

              <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                <button
                  onClick={() => { setViewMode('grid'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" /> Cards
                </button>
                <button
                  onClick={() => { setViewMode('teams'); exitCompare(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" /> Teams
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' && !compareMode && (
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

          {compareMode && (
            <div className="mt-3 text-sm text-muted-foreground">
              Tap two players to compare · {selectedCount}/2 selected
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
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
                    <div key={player.id} className={`relative ${isSelected(player.id) ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
                      <PlayerCard player={player} stats={statsMap[player.id]} onClick={handlePlayerClick} index={i} />
                      {isSelected(player.id) && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10">
                          {compareSlots[0]?.id === player.id ? '1' : '2'}
                        </div>
                      )}
                    </div>
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

      {/* Compare floating bar */}
      <AnimatePresence>
        {compareMode && selectedCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 bg-card border border-border shadow-xl rounded-2xl px-5 py-3">
              {compareSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  {slot ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: slot.team.color }}
                      >
                        {slot.first_name[0]}{slot.last_name[0]}
                      </div>
                      <span className="text-sm font-semibold max-w-[100px] truncate">
                        {slot.last_name}
                      </span>
                      <button onClick={() => setCompareSlots(i === 0 ? [null, compareSlots[1]] : [compareSlots[0], null])} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40" />
                  )}
                  {i === 0 && <span className="text-xs font-bold text-muted-foreground mx-1">vs</span>}
                </div>
              ))}
              <button
                disabled={selectedCount < 2}
                onClick={() => setCompareOpen(true)}
                className="ml-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                Compare
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerDetailModal
        player={selectedPlayer}
        stats={selectedPlayer ? statsMap[selectedPlayer.id] : undefined}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {compareSlots[0] && compareSlots[1] && (
        <PlayerCompareModal
          players={[compareSlots[0], compareSlots[1]]}
          stats={[statsMap[compareSlots[0].id], statsMap[compareSlots[1].id]]}
          open={compareOpen}
          onOpenChange={setCompareOpen}
        />
      )}
    </div>
  );
};

export default Index;
