import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, LayoutGrid, Building2, RefreshCw, GitCompareArrows, X, Heart, Star, Trophy, Sun, Moon, ArrowDownWideNarrow } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerCardSkeleton } from '@/components/PlayerCardSkeleton';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { PlayerCompareModal } from '@/components/PlayerCompareModal';
import { TeamGrid } from '@/components/TeamGrid';
import { StandingsView } from '@/components/StandingsView';
import { usePlayersQuery, usePlayerStatsQuery, useTeamRecordsQuery } from '@/hooks/use-nba-data';
import { useFavorites } from '@/hooks/use-favorites';
import { NBAPlayer, ViewMode, PositionFilter } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';
import { toast } from 'sonner';
import { isUsingFallbackData, getLastRefreshed, getApiStatus, getFallbackDataAge } from '@/lib/nba-api';
import { useQueryClient } from '@tanstack/react-query';

type GridFilter = PositionFilter | 'FAV_PLAYERS' | 'FAV_TEAMS';
type SortOption = 'default' | 'ppg' | 'rpg' | 'apg' | 'min';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
  { key: 'min', label: 'MIN' },
];

const FILTER_BUTTONS: { key: GridFilter; label: string; icon?: 'heart' | 'star' }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FAV_PLAYERS', label: 'Fav Players', icon: 'heart' },
  { key: 'FAV_TEAMS', label: 'Fav Teams', icon: 'star' },
  { key: 'G', label: 'Guards' },
  { key: 'F', label: 'Forwards' },
  { key: 'C', label: 'Centers' },
];

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridFilter, setGridFilter] = useState<GridFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedPlayer, setSelectedPlayer] = useState<NBAPlayer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareSlots, setCompareSlots] = useState<[NBAPlayer | null, NBAPlayer | null]>([null, null]);
  const [compareOpen, setCompareOpen] = useState(false);

  const { favPlayerIds, favTeamIds, toggleFavPlayer, toggleFavTeam } = useFavorites();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: players = [], isFetching: playersFetching } = usePlayersQuery();
  const playerIds = useMemo(() => players.map(p => p.id), [players]);
  const { data: statsMap = {}, isFetching: statsFetching } = usePlayerStatsQuery(playerIds);
  const { data: teamRecords = {}, isFetching: recordsFetching } = useTeamRecordsQuery();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['nba-players'] });
    queryClient.invalidateQueries({ queryKey: ['nba-stats'] });
    queryClient.invalidateQueries({ queryKey: ['nba-team-records'] });
    toast.info('Refreshing data from live API...');
  }, [queryClient]);

  const isFetching = playersFetching || statsFetching || recordsFetching;
  const isInitialLoad = players.length === 0 && playersFetching;

  const hasToasted = useRef(false);
  useEffect(() => {
    if (!playersFetching && players.length > 0 && !hasToasted.current) {
      hasToasted.current = true;
      const status = getApiStatus();
      if (isUsingFallbackData()) {
        getFallbackDataAge().then(days => {
          const ageMsg = days > 3 ? ` (fallback data is ${days} days old)` : '';
          toast.error(`Live API failed — showing cached data${ageMsg}${status.lastError ? `\n${status.lastError}` : ''}`, { duration: 8000 });
        });
      } else if (status.errors > 0) {
        toast.warning(`Loaded live data with ${status.errors} API errors`, { duration: 5000 });
      }
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
      if (compareSlots[0]?.id === player.id) { setCompareSlots([null, compareSlots[1]]); return; }
      if (compareSlots[1]?.id === player.id) { setCompareSlots([compareSlots[0], null]); return; }
      if (!compareSlots[0]) { setCompareSlots([player, compareSlots[1]]); }
      else if (!compareSlots[1]) { setCompareSlots([compareSlots[0], player]); }
      else { setCompareSlots([compareSlots[0], player]); }
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

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center" aria-hidden="true">
                <span className="text-primary-foreground text-lg font-bold">🏀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  NBA Cards
                </h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {players.length} Players
                  {isUsingFallbackData()
                    ? <span className="text-yellow-600 dark:text-yellow-400">· Sample Data</span>
                    : <span className="text-green-600 dark:text-green-400">· Live</span>
                  }
                  {(() => { const t = getLastRefreshed(); return t ? <span>· Updated {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : null; })()}
                  {isFetching
                    ? <RefreshCw className="h-3 w-3 animate-spin text-primary" aria-label="Loading" />
                    : <button onClick={handleRefresh} className="hover:text-foreground transition-colors" aria-label="Refresh data" title="Refresh data">
                        <RefreshCw className="h-3 w-3" />
                      </button>
                  }
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
              {viewMode === 'grid' && !compareMode && (
                <div className="relative flex-1 min-w-[180px] max-w-sm order-first sm:order-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input placeholder="Search players or teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 sm:h-9 text-sm" aria-label="Search players or teams" />
                </div>
              )}

              {(viewMode === 'grid' || viewMode === 'teams') && (
                <button onClick={() => compareMode ? exitCompare() : setCompareMode(true)} aria-pressed={compareMode}
                  className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-sm font-medium rounded-lg border transition-colors shrink-0 min-h-[44px] sm:min-h-0 ${compareMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                  <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden xs:inline">{compareMode ? 'Exit Compare' : 'Compare'}</span>
                </button>
              )}

              <nav className="flex rounded-lg border border-border overflow-hidden shrink-0" role="tablist" aria-label="View mode">
                <button role="tab" aria-selected={viewMode === 'grid'} onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Cards</span>
                </button>
                <button role="tab" aria-selected={viewMode === 'teams'} onClick={() => setViewMode('teams')}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${viewMode === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
                  <Building2 className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Teams</span>
                </button>
                <button role="tab" aria-selected={viewMode === 'standings'} onClick={() => { setViewMode('standings'); exitCompare(); }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${viewMode === 'standings' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
                  <Trophy className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Standings</span>
                </button>
              </nav>

              <button onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="p-2.5 sm:p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {viewMode === 'grid' && !compareMode && (
            <div className="mt-3 space-y-2" role="toolbar" aria-label="Filter and sort">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {FILTER_BUTTONS.map(({ key, label, icon }) => (
                  <button key={key} onClick={() => setGridFilter(key)} aria-pressed={gridFilter === key}
                    className={`flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors min-h-[36px] sm:min-h-0 ${gridFilter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {icon === 'heart' && <Heart className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} aria-hidden="true" />}
                    {icon === 'star' && <Star className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} aria-hidden="true" />}
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1" role="group" aria-label="Sort by">
                <ArrowDownWideNarrow className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => setSortBy(key)} aria-pressed={sortBy === key}
                    className={`px-2.5 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors shrink-0 min-h-[36px] sm:min-h-0 ${sortBy === key ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {compareMode && (
            <div className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">
              Tap two players to compare · {selectedCount}/2 selected
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {isInitialLoad ? (
                <PlayerCardSkeleton count={8} />
              ) : filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" role="list" aria-label="Player cards">
                  {filteredPlayers.map((player, i) => (
                    <div key={player.id} role="listitem" className={`relative ${isSelected(player.id) ? 'ring-2 ring-primary rounded-2xl' : ''}`}>
                      <PlayerCard player={player} stats={statsMap[player.id]} onClick={handlePlayerClick} index={i} teamRecord={teamRecords[player.team.id]} />
                      <button onClick={(e) => { e.stopPropagation(); toggleFavPlayer(player.id); }}
                        className="absolute top-3 left-3 z-10 p-2 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`${favPlayerIds.has(player.id) ? 'Remove' : 'Add'} ${player.first_name} ${player.last_name} ${favPlayerIds.has(player.id) ? 'from' : 'to'} favorites`}
                        aria-pressed={favPlayerIds.has(player.id)}>
                        <Heart className={`h-4 w-4 transition-colors ${favPlayerIds.has(player.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} aria-hidden="true" />
                      </button>
                      {isSelected(player.id) && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10">
                          {compareSlots[0]?.id === player.id ? '1' : '2'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20" role="status">
                  <p className="text-muted-foreground text-lg">
                    {gridFilter === 'FAV_PLAYERS' ? 'No favorite players yet' : gridFilter === 'FAV_TEAMS' ? 'No favorite teams yet' : 'No players found'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {gridFilter === 'FAV_PLAYERS' ? 'Tap the heart on any player card to bookmark them' : gridFilter === 'FAV_TEAMS' ? 'Tap the star on any team in Teams view to bookmark them' : 'Try a different search or filter'}
                  </p>
                </div>
              )}
            </motion.div>
          ) : viewMode === 'teams' ? (
            <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <TeamGrid players={players} onPlayerClick={handlePlayerClick} favTeamIds={favTeamIds} onToggleFavTeam={toggleFavTeam} teamRecords={teamRecords} compareMode={compareMode} compareSlots={compareSlots} />
            </motion.div>
          ) : (
            <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <StandingsView favTeamIds={favTeamIds} onToggleFavTeam={toggleFavTeam} teamRecords={teamRecords} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {compareMode && selectedCount > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" role="toolbar" aria-label="Player comparison">
            <div className="flex items-center gap-2 sm:gap-3 bg-card border border-border shadow-xl rounded-2xl px-3 sm:px-5 py-3 max-w-[calc(100vw-2rem)]">
              {compareSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                  {slot ? (
                    <>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: slot.team.color }} aria-hidden="true">
                        {slot.first_name[0]}{slot.last_name[0]}
                      </div>
                      <span className="text-sm font-semibold max-w-[60px] sm:max-w-[100px] truncate">{slot.last_name}</span>
                      <button onClick={() => setCompareSlots(i === 0 ? [null, compareSlots[1]] : [compareSlots[0], null])}
                        className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${slot.last_name} from comparison`}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40 shrink-0" aria-hidden="true" />
                  )}
                  {i === 0 && <span className="text-xs font-bold text-muted-foreground" aria-hidden="true">vs</span>}
                </div>
              ))}
              <button disabled={selectedCount < 2} onClick={() => setCompareOpen(true)} aria-label="Compare selected players"
                className="ml-1 sm:ml-2 px-3 sm:px-4 py-2 sm:py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity min-h-[44px]">
                Compare
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerDetailModal player={selectedPlayer} stats={selectedPlayer ? statsMap[selectedPlayer.id] : undefined} open={modalOpen} onOpenChange={setModalOpen} />

      {compareSlots[0] && compareSlots[1] && (
        <PlayerCompareModal players={[compareSlots[0], compareSlots[1]]} stats={[statsMap[compareSlots[0].id], statsMap[compareSlots[1].id]]} open={compareOpen} onOpenChange={setCompareOpen} />
      )}
    </div>
  );
};

export default Index;
