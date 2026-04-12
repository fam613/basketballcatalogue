import { NBAPlayer, NBATeam, PlayerStats } from './types'
import { NBA_PLAYERS, NBA_TEAMS, PLAYER_STATS } from './nba-data'

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

type QueryValue = string | number | boolean | Array<string | number | boolean>

function createNbaApiUrl(endpoint: string, params: Record<string, QueryValue> = {}) {
  const searchParams = new URLSearchParams({ endpoint })

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(`${key}[]`, String(item)))
      continue
    }

    searchParams.append(key, String(value))
  }

  return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nba-api?${searchParams}`
}

async function callNbaApi(endpoint: string, params: Record<string, QueryValue> = {}) {
  const url = createNbaApiUrl(endpoint, params)
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}

// Team color mapping for display
const TEAM_COLORS: Record<string, { color: string; secondaryColor: string }> = {}
NBA_TEAMS.forEach(t => {
  TEAM_COLORS[t.abbreviation] = { color: t.color, secondaryColor: t.secondaryColor }
})

function mapApiTeam(apiTeam: any): NBATeam {
  const colors = TEAM_COLORS[apiTeam.abbreviation] || { color: '#333', secondaryColor: '#666' }
  return {
    id: apiTeam.id,
    abbreviation: apiTeam.abbreviation,
    city: apiTeam.city,
    conference: apiTeam.conference,
    division: apiTeam.division,
    full_name: apiTeam.full_name,
    name: apiTeam.name,
    wins: 0, // API doesn't provide W-L on team object
    losses: 0,
    color: colors.color,
    secondaryColor: colors.secondaryColor,
  }
}

function mapApiPlayer(apiPlayer: any): NBAPlayer {
  const team = mapApiTeam(apiPlayer.team)
  return {
    id: apiPlayer.id,
    first_name: apiPlayer.first_name,
    last_name: apiPlayer.last_name,
    position: apiPlayer.position || 'N/A',
    height: apiPlayer.height || 'N/A',
    weight: apiPlayer.weight || 'N/A',
    jersey_number: apiPlayer.jersey_number || '',
    college: apiPlayer.college || 'N/A',
    country: apiPlayer.country || 'USA',
    draft_year: apiPlayer.draft_year,
    draft_round: apiPlayer.draft_round,
    draft_number: apiPlayer.draft_number,
    team,
    career_teams: [team.abbreviation], // API doesn't provide history
  }
}

function mapApiStats(apiStats: any): PlayerStats {
  return {
    player_id: apiStats.player_id,
    pts: apiStats.pts ?? 0,
    reb: apiStats.reb ?? 0,
    ast: apiStats.ast ?? 0,
    min: apiStats.min ?? '0',
    gp: apiStats.games_played ?? 0,
    stl: apiStats.stl ?? 0,
    blk: apiStats.blk ?? 0,
    fg_pct: apiStats.fg_pct ?? 0,
    fg3_pct: apiStats.fg3_pct ?? 0,
    ft_pct: apiStats.ft_pct ?? 0,
    turnover: apiStats.turnover ?? 0,
  }
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function formatMinutes(values: number[]) {
  return average(values).toFixed(1)
}

function mapAggregatedStats(playerId: number, statLines: any[]): PlayerStats {
  const minutes = statLines
    .map((line) => Number.parseFloat(String(line.min ?? '0')))
    .filter((value) => Number.isFinite(value))

  return {
    player_id: playerId,
    pts: average(statLines.map((line) => Number(line.pts ?? 0))),
    reb: average(statLines.map((line) => Number(line.reb ?? 0))),
    ast: average(statLines.map((line) => Number(line.ast ?? 0))),
    min: formatMinutes(minutes),
    gp: statLines.length,
    stl: average(statLines.map((line) => Number(line.stl ?? 0))),
    blk: average(statLines.map((line) => Number(line.blk ?? 0))),
    fg_pct: average(statLines.map((line) => Number(line.fg_pct ?? 0))),
    fg3_pct: average(statLines.map((line) => Number(line.fg3_pct ?? 0))),
    ft_pct: average(statLines.map((line) => Number(line.ft_pct ?? 0))),
    turnover: average(statLines.map((line) => Number(line.turnover ?? 0))),
  }
}

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    // Fetch first few pages of players (API returns 25 per page by default)
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    const maxPages = 4 // ~100 players
    
    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, QueryValue> = { per_page: 100 }
      if (cursor) params.cursor = String(cursor)
      
      const data = await callNbaApi('players', params)
      
      if (data.data && Array.isArray(data.data)) {
        const mapped = data.data
          .filter((p: any) => p.team && p.position) // only active players with positions
          .map(mapApiPlayer)
        allPlayers.push(...mapped)
      }
      
      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
    }
    
    return allPlayers.length > 0 ? allPlayers : NBA_PLAYERS
  } catch (error) {
    console.warn('Failed to fetch players from API, using fallback data:', error)
    return NBA_PLAYERS
  }
}

export async function fetchSeasonAverages(playerIds: number[]): Promise<Record<number, PlayerStats>> {
  // The free tier of balldontlie.io does not include stats/season_averages endpoints.
  // Return fallback data directly. Upgrade to a paid plan to enable live stats.
  return PLAYER_STATS
}

export async function fetchTeams(): Promise<NBATeam[]> {
  try {
    const data = await callNbaApi('teams')
    
    if (data.data && Array.isArray(data.data)) {
      const teams = data.data.map(mapApiTeam)
      return teams.length > 0 ? teams : NBA_TEAMS
    }
    
    return NBA_TEAMS
  } catch (error) {
    console.warn('Failed to fetch teams, using fallback data:', error)
    return NBA_TEAMS
  }
}
