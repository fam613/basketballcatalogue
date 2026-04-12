import { supabase } from '@/integrations/supabase/client'
import { NBAPlayer, NBATeam, PlayerStats } from './types'
import { NBA_PLAYERS, NBA_TEAMS, PLAYER_STATS } from './nba-data'

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

async function callNbaApi(endpoint: string, params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams({ endpoint, ...params })
  const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nba-api?${searchParams}`
  
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

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    // Fetch first few pages of players (API returns 25 per page by default)
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    const maxPages = 4 // ~100 players
    
    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, string> = { per_page: '100' }
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
  try {
    const currentYear = new Date().getFullYear()
    // Season year is the start year (e.g., 2025 for 2025-26 season)
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
    
    const statsMap: Record<number, PlayerStats> = {}
    
    // balldontlie v1: season_averages takes player_ids[] param
    // Batch in groups of 25
    for (let i = 0; i < playerIds.length; i += 25) {
      const batch = playerIds.slice(i, i + 25)
      const params: Record<string, string> = {
        season: String(season),
      }
      // Add each player_id as separate param
      const searchParams = new URLSearchParams({ endpoint: 'season_averages', ...params })
      batch.forEach(id => searchParams.append('player_ids[]', String(id)))
      
      const url = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nba-api?${searchParams}`
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      })
      
      if (!response.ok) continue
      const data = await response.json()
      
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((s: any) => {
          statsMap[s.player_id] = mapApiStats(s)
        })
      }
    }
    
    return Object.keys(statsMap).length > 0 ? statsMap : PLAYER_STATS
  } catch (error) {
    console.warn('Failed to fetch season averages, using fallback data:', error)
    return PLAYER_STATS
  }
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
