import { Search, LayoutGrid, Building2, RefreshCw, GitCompareArrows, Heart, Star, Trophy, Sun, Moon, ArrowDownWideNarrow } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NBAPlayer, ViewMode, PositionFilter } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type GridFilter = PositionFilter | 'FAV_PLAYERS' | 'FAV_TEAMS';
type SortOption = 'default' | 'ppg' | 'rpg' | 'apg' | 'min';

const FILTER_BUTTONS: { key: GridFilter; label: string; icon?: 'heart' | 'star' }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FAV_PLAYERS', label: 'Fav Players', icon: 'heart' },
  { key: 'FAV_TEAMS', label: 'Fav Teams', icon: 'star' },
  { key: 'G', label: 'Guards' },
  { key: 'F', label: 'Forwards' },
  { key: 'C', label: 'Centers' },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
  { key: 'min', label: 'MIN' },
];

export { type GridFilter, type SortOption };

interface AppHeaderProps {
  playerCount: number;
  isFetching: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  gridFilter: GridFilter;
  setGridFilter: (filter: GridFilter) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  compareMode: boolean;
  setCompareMode: (mode: boolean) => void;
  exitCompare: () => void;
  selectedCount: number;
}

export function AppHeader({
  playerCount,
  isFetching,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  gridFilter,
  setGridFilter,
  sortBy,
  setSortBy,
  compareMode,
  setCompareMode,
  exitCompare,
  selectedCount,
}: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
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
                {playerCount} Active Players · Live 2025-26 Stats
                {isFetching && (
                  <RefreshCw className="h-3 w-3 animate-spin text-primary" aria-label="Loading data" />
                )}
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-3 sm:justify-end">
            {viewMode === 'grid' && !compareMode && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search players or teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  aria-label="Search players or teams"
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
                aria-pressed={compareMode}
                aria-label={compareMode ? 'Exit compare mode' : 'Enter compare mode'}
              >
                <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
                {compareMode ? 'Exit Compare' : 'Compare'}
              </button>
            )}

            <nav className="flex rounded-lg border border-border overflow-hidden shrink-0" role="tablist" aria-label="View mode">
              <button
                role="tab"
                aria-selected={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Cards
              </button>
              <button
                role="tab"
                aria-selected={viewMode === 'teams'}
                onClick={() => setViewMode('teams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" /> Teams
              </button>
              <button
                role="tab"
                aria-selected={viewMode === 'standings'}
                onClick={() => { setViewMode('standings'); exitCompare(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'standings' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <Trophy className="h-4 w-4" aria-hidden="true" /> Standings
              </button>
            </nav>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {viewMode === 'grid' && !compareMode && (
          <div className="flex flex-wrap gap-2 mt-3" role="toolbar" aria-label="Filter and sort options">
            {FILTER_BUTTONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setGridFilter(key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  gridFilter === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={gridFilter === key}
              >
                {icon === 'heart' && <Heart className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} aria-hidden="true" />}
                {icon === 'star' && <Star className={`h-3 w-3 ${gridFilter === key ? 'fill-current' : ''}`} aria-hidden="true" />}
                {label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="Sort by">
              <ArrowDownWideNarrow className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                    sortBy === key
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={sortBy === key}
                >
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
  );
}
