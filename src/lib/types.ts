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
  weight: string | null;
  jersey_number: string | null;
  college: string;
  country: string;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
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

export type ViewMode = 'grid' | 'teams' | 'standings' | 'playoffs';
export type PositionFilter = 'ALL' | 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F';

export interface PlayoffGame {
  id: number;
  date: string;
  status: string;
  home_team: { id: number; abbreviation: string; full_name: string };
  visitor_team: { id: number; abbreviation: string; full_name: string };
  home_team_score: number;
  visitor_team_score: number;
}

export interface PlayoffSeries {
  team1Id: number;
  team2Id: number;
  team1Abbr: string;
  team2Abbr: string;
  team1Name: string;
  team2Name: string;
  team1Wins: number;
  team2Wins: number;
  games: PlayoffGame[];
  conference: string;
  status: 'in_progress' | 'completed';
  winnerId: number | null;
}
