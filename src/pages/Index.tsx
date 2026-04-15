import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Heart } from 'lucide-react';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerCardSkeleton } from '@/components/PlayerCardSkeleton';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { PlayerCompareModal } from '@/components/PlayerCompareModal';
import { TeamGrid } from '@/components/TeamGrid';
import { StandingsView } from '@/components/StandingsView';
import { AppHeader, type GridFilter, type SortOption } from '@/components/AppHeader';
import { usePlayersQuery, usePlayerStatsQuery, useTeamRecordsQuery } from '@/hooks/use-nba-data';
import { useFavorites } from '@/hooks/use-favorites';
import { NBAPlayer, ViewMode } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { isUsingFallbackData } from '@/lib/nba-api';

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridFilter, setGridFilter] = useState<GridFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedPlayer, setSelectedPlayer] = useState<NBAPlayer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareSlots, setCompareSlots] = useState<[NBAPlayer | null, NBAPlayer | null]>([null, null]);
  const [compareOpen, setCompareOpen] = useState(false);

  const { favPlayerIds, favTeamIds, toggleFavPlayer, toggleFavTeam } = useFavorites();

  const { data: players = [], isFetching: playersFetching } = usePlayersQuery();
  const playerIds = useMemo(() => players.map(p => p.id), [players]);
  const { data: statsMap = {}, isFetching: statsFetching } = usePlayerStatsQuery(playerIds);
  const { data: teamRecords = {}, isFetching: recordsFetching } = useTeamRecordsQuery();

  const isFetching = playersFetching || statsFetching || recordsFetching;
  const isInitialLoad = players.length === 0 && playersFetching;

  // Toast notification when fallback data is being used
  const hasToasted = useRef(false);
  useEffect(() => {
    if (!playersFetching && players.length > 0 && isUsingFallbackData() && !hasToasted.current) {
      hasToasted.current = true;
      toast.info('Live stats unavailable — showing sample data', {
        duration: 5000,
      });
    }
  }, [playersFetching, players.length]);

  const filteredPlayers = useMemo(() => {
    let result = searchQuery
      ? players.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.team.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.team.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [...players];

    if (gridFilter === 'FAV_PLAYERS') {
      result = result.filter(p => favPlayerIds.has(p.id));
    } else if (gridFilter === 'FAV_TEAMS') {
      result = result.filter(p => favTeamIds.has(p.team.id));
    } else if (gridFilter !== 'ALL') {
      result = result.filter(p => p.position.includes(gridFilter.charAt(0)));
    }

    if (sortBy !== 'default') {
      result.sort((a, b) => {
        const sa = statsMap[a.id];
        const sb = statsMap[b.id];
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        switch (sortBy) {
          case 'ppg': return sb.pts - sa.pts;
          case 'rpg': return sb.reb - sa.reb;
          case 'apg': return sb.ast - sa.ast;
          case 'min': return parseFloat(sb.min) - parseFloat(sa.min);
          default: return 0;
        }
      });
    }

    return result;
  }, [players, searchQuery, gridFilter, favPlayerIds, favTeamIds, sortBy, statsMap]);

  const handlePlayerClick = (player: NBAPlayer) => {
    if (compareMode) {
      if (compareSlots[0]?.id === player.id) {
        setCompareSlots([null, compareSlots[1]]);
        return;
      }
      if (compareSlots[1]?.id === player.id) {
        setCompareSlots([compareSlots[0], null]);
        return;
      }
      if (!compareSlots[0]) {
        setCompareSlots([player, compareSlots[1]]);
      } else if (!compareSlots[1]) {
        setCompareSlots([compareSlots[0], player]);
      } else {
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">
        Skip to main content
      </a>

      <AppHeader
        playerCount={players.length}
        isFetching={isFetching}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        gridFilter={gridFilter}
        setGridFilter={setGridFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        exitCompare={exitCompare}
        selectedCount={selectedCount}
      />

      {/* Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isInitialLoad ? (
                <PlayerCardSkeleton count={8} />
              ) : filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" role="list" aria-label="Player cards">
                  {filteredPlayers.map((player, i) => (
                    <div key={player.id} role="listitem" className={`relative ${isSelected(player.id) ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
                      <PlayerCard player={player} stats={statsMap[player.id]} onClick={handlePlayerClick} index={i} teamRecord={teamRecords[player.team.id]} />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavPlayer(player.id); }}
                        className="absolute top-4 left-4 z-10 p-1 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                        aria-label={`${favPlayerIds.has(player.id) ? 'Remove' : 'Add'} ${player.first_name} ${player.last_name} ${favPlayerIds.has(player.id) ? 'from' : 'to'} favorites`}
                        aria-pressed={favPlayerIds.has(player.id)}
                      >
                        <Heart className={`h-4 w-4 transition-colors ${favPlayerIds.has(player.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} aria-hidden="true" />
                      </button>
                      {isSelected(player.id) && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10" aria-label={`Compare slot ${compareSlots[0]?.id === player.id ? '1' : '2'}`}>
                          {compareSlots[0]?.id === player.id ? '1' : '2'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20" role="status">
                  <p className="text-muted-foreground text-lg">
                    {gridFilter === 'FAV_PLAYERS' ? 'No favorite players yet' :
                     gridFilter === 'FAV_TEAMS' ? 'No favorite teams yet' :
                     'No players found'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {gridFilter === 'FAV_PLAYERS' ? 'Tap the heart on any player card to bookmark them' :
                     gridFilter === 'FAV_TEAMS' ? 'Tap the star on any team in Teams view to bookmark them' :
                     'Try a different search or filter'}
                  </p>
                </div>
              )}
            </motion.div>
          ) : viewMode === 'teams' ? (
            <motion.div
              key="teams"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TeamGrid players={players} onPlayerClick={handlePlayerClick} favTeamIds={favTeamIds} onToggleFavTeam={toggleFavTeam} teamRecords={teamRecords} compareMode={compareMode} compareSlots={compareSlots} />
            </motion.div>
          ) : (
            <motion.div
              key="standings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StandingsView favTeamIds={favTeamIds} onToggleFavTeam={toggleFavTeam} teamRecords={teamRecords} />
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
            role="toolbar"
            aria-label="Player comparison"
          >
            <div className="flex items-center gap-3 bg-card border border-border shadow-xl rounded-2xl px-5 py-3">
              {compareSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  {slot ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: slot.team.color }}
                        aria-hidden="true"
                      >
                        {slot.first_name[0]}{slot.last_name[0]}
                      </div>
                      <span className="text-sm font-semibold max-w-[100px] truncate">
                        {slot.last_name}
                      </span>
                      <button
                        onClick={() => setCompareSlots(i === 0 ? [null, compareSlots[1]] : [compareSlots[0], null])}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${slot.last_name} from comparison`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40" aria-label="Empty comparison slot" />
                  )}
                  {i === 0 && <span className="text-xs font-bold text-muted-foreground mx-1" aria-hidden="true">vs</span>}
                </div>
              ))}
              <button
                disabled={selectedCount < 2}
                onClick={() => setCompareOpen(true)}
                className="ml-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
                aria-label="Compare selected players"
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
