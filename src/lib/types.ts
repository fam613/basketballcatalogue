export interface NBATeam {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
  wins: number;
  losses: number;
  color: string;
  secondaryColor: string;
}

export interface NBAPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string;
  weight: string;
  jersey_number: string;
  college?: string;
  country?: string;
  draft_year?: number | null;
  draft_round?: number | null;
  draft_number?: number | null;
  team: NBATeam;
  career_teams?: string[];
}

export interface PlayerStats {
  player_id: number;
  pts: number;
  reb: number;
  ast: number;
  min: string;
  gp: number;
  stl: number;
  blk: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  turnover: number;
}

export type ViewMode = 'grid' | 'teams' | 'standings';
export type PositionFilter = 'ALL' | 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F';
