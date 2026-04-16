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
  
  const data = await response.json()
  
  if (data?.fallback) {
    console.warn('API rate-limited or unavailable, using fallback data')
    throw new Error('FALLBACK')
  }
  
  return data
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

// Valid NBA team IDs from the balldontlie API (30 NBA teams)
const NBA_TEAM_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
])

function isActiveNbaPlayer(p: any): boolean {
  // Must have a team object with a valid NBA team ID
  if (!p.team || !p.team.id || !NBA_TEAM_IDS.has(p.team.id)) return false
  // Must have a position assigned (inactive players often lack one)
  if (!p.position || p.position.trim() === '') return false
  // Must have a team abbreviation
  if (!p.team.abbreviation || p.team.abbreviation.trim() === '') return false
  return true
}

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    // Use players/active endpoint (ALL-STAR tier) to fetch ONLY active NBA players
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    const maxPages = 8 // ~600 active players at 100/page

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, QueryValue> = { per_page: 100 }
      if (cursor) params.cursor = cursor

      const data = await callNbaApi('players/active', params)

      if (data.data && Array.isArray(data.data)) {
        allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer))
      }

      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
    }

    // Deduplicate by player ID
    const seen = new Set<number>()
    const deduped = allPlayers.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    if (deduped.length > 0) return deduped

    // Fallback: fetch team-by-team if active endpoint fails
    return await fetchPlayersWithTeamFilter()
  } catch (error) {
    console.warn('Failed to fetch active players, trying fallback:', error)
    try {
      return await fetchPlayersWithTeamFilter()
    } catch {
      console.warn('Fallback also failed, using static data')
      return NBA_PLAYERS
    }
  }
}

async function fetchPlayersWithTeamFilter(): Promise<NBAPlayer[]> {
  // Fetch players team-by-team to ensure only active roster players
  const allPlayers: NBAPlayer[] = []
  for (const teamId of NBA_TEAM_IDS) {
    try {
      const data = await callNbaApi('players', { per_page: 50, 'team_ids[]': teamId })
      if (data.data && Array.isArray(data.data)) {
        allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer))
      }
    } catch (err) {
      console.warn(`Failed to fetch team ${teamId}:`, err)
    }
  }
  return allPlayers.length > 0 ? allPlayers : NBA_PLAYERS
}

export async function fetchSeasonAverages(playerIds: number[]): Promise<Record<number, PlayerStats>> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1

    const results: Record<number, PlayerStats> = {}

    // season_averages takes one player_id at a time — batch in chunks
    const chunkSize = 10
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize)
      const promises = chunk.map(async (pid) => {
        try {
          const data = await callNbaApi('season_averages', { player_id: pid, season })
          if (data.data && data.data.length > 0) {
            results[pid] = mapApiStats(data.data[0])
          }
        } catch {
          // skip individual failures
        }
      })
      await Promise.all(promises)
    }

    // Merge with fallback for any missing players
    return { ...PLAYER_STATS, ...results }
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

export async function fetchTeamRecords(): Promise<Record<number, { wins: number; losses: number }>> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1

    const records: Record<number, { wins: number; losses: number }> = {}
    let cursor: number | null = null
    const maxPages = 15 // ~1500 games covers a full season (1230 regular season)

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, QueryValue> = {
        per_page: 100,
        seasons: [season],
        postseason: false,
      }
      if (cursor) params.cursor = cursor

      const data = await callNbaApi('games', params)

      if (!data.data || !Array.isArray(data.data)) break

      for (const game of data.data) {
        if (game.status !== 'Final') continue

        const homeId = game.home_team?.id
        const visitorId = game.visitor_team?.id
        if (!homeId || !visitorId) continue

        if (!records[homeId]) records[homeId] = { wins: 0, losses: 0 }
        if (!records[visitorId]) records[visitorId] = { wins: 0, losses: 0 }

        if (game.home_team_score > game.visitor_team_score) {
          records[homeId].wins++
          records[visitorId].losses++
        } else {
          records[visitorId].wins++
          records[homeId].losses++
        }
      }

      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
    }

    return records
  } catch (error) {
    console.warn('Failed to fetch team records from games API:', error)
    return {}
  }
}
