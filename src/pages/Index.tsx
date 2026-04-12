import { useState, useMemo } from 'react';
import { Search, LayoutGrid, Building2, RefreshCw, GitCompareArrows, X, Heart, Star, Trophy, Sun, Moon, ArrowDownWideNarrow } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PlayerCard } from '@/components/PlayerCard';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';
import { PlayerCompareModal } from '@/components/PlayerCompareModal';
import { TeamGrid } from '@/components/TeamGrid';
import { StandingsView } from '@/components/StandingsView';
import { usePlayersQuery, usePlayerStatsQuery, useTeamRecordsQuery } from '@/hooks/use-nba-data';
import { useFavorites } from '@/hooks/use-favorites';
import { NBAPlayer, ViewMode, PositionFilter } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';

const POSITIONS: PositionFilter[] = ['ALL', 'G', 'F', 'C'];

type GridFilter = PositionFilter | 'FAV_PLAYERS' | 'FAV_TEAMS';
type SortOption = 'default' | 'ppg' | 'rpg' | 'apg' | 'min';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
  { key: 'min', label: 'MIN' },
];

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
  const { theme, toggleTheme } = useTheme();

  const { data: players = [], isFetching: playersFetching } = usePlayersQuery();
  const playerIds = useMemo(() => players.map(p => p.id), [players]);
  const { data: statsMap = {}, isFetching: statsFetching } = usePlayerStatsQuery(playerIds);
  const { data: teamRecords = {}, isFetching: recordsFetching } = useTeamRecordsQuery();

  const isFetching = playersFetching || statsFetching || recordsFetching;

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
  }, [players, searchQuery, gridFilter, favPlayerIds, favTeamIds]);

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

  const FILTER_BUTTONS: { key: GridFilter; label: string; icon?: 'heart' | 'star' }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'FAV_PLAYERS', label: 'Fav Players', icon: 'heart' },
    { key: 'FAV_TEAMS', label: 'Fav Teams', icon: 'star' },
    { key: 'G', label: 'Guards' },
    { key: 'F', label: 'Forwards' },
    { key: 'C', label: 'Centers' },
  ];

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

              {(viewMode === 'grid' || viewMode === 'teams') && (
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
                  onClick={() => { setViewMode('teams'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="h-4 w-4" /> Teams
                </button>
                <button
                  onClick={() => { setViewMode('standings'); exitCompare(); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'standings' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Trophy className="h-4 w-4" /> Standings
                </button>
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {viewMode === 'grid' && !compareMode && (
            <div className="flex flex-wrap gap-2 mt-3">
              {FILTER_BUTTONS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setGridFilter(key)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    gridFilter === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {icon === 'heart' && <Heart className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} />}
                  {icon === 'star' && <Star className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} />}
                  {label}
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
                      <PlayerCard player={player} stats={statsMap[player.id]} onClick={handlePlayerClick} index={i} teamRecord={teamRecords[player.team.id]} />
                      {/* Favorite heart */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavPlayer(player.id); }}
                        className="absolute top-4 left-4 z-10 p-1 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
                      >
                        <Heart className={`h-4 w-4 transition-colors ${favPlayerIds.has(player.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
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
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    {gridFilter === 'FAV_PLAYERS' ? 'No favorite players yet' :
                     gridFilter === 'FAV_TEAMS' ? 'No favorite teams yet' :
                     'No players found'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {gridFilter === 'FAV_PLAYERS' ? 'Tap the ♥ on any player card to bookmark them' :
                     gridFilter === 'FAV_TEAMS' ? 'Tap the ★ on any team in Teams view to bookmark them' :
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
              <TeamGrid onPlayerClick={handlePlayerClick} favTeamIds={favTeamIds} onToggleFavTeam={toggleFavTeam} teamRecords={teamRecords} compareMode={compareMode} compareSlots={compareSlots} />
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
