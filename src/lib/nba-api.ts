import { NBAPlayer, NBATeam, PlayerStats } from './types'
import { NBA_PLAYERS, NBA_TEAMS, PLAYER_STATS } from './nba-data'

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

type QueryValue = string | number | boolean | Array<string | number | boolean>

// Simple rate-limit tracker to stop flooding the API after a 429
let rateLimitedUntil = 0

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
  // If we recently hit a rate limit, bail out immediately
  if (Date.now() < rateLimitedUntil) {
    throw new Error('RATE_LIMITED')
  }

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
    // Back off for 60 seconds after a rate limit
    rateLimitedUntil = Date.now() + 60_000
    console.warn('API rate-limited, backing off for 60s')
    throw new Error('RATE_LIMITED')
  }
  
  return data
}

// Small delay helper to avoid hammering the API
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Team color mapping for display
const TEAM_COLORS: Record<string, { color: string; secondaryColor: string }> = {}
NBA_TEAMS.forEach(t => {
  TEAM_COLORS[t.abbreviation] = { color: t.color, secondaryColor: t.secondaryColor }
})

// Lookup fallback wins/losses from static data
const TEAM_RECORDS_FALLBACK: Record<number, { wins: number; losses: number }> = {}
NBA_TEAMS.forEach(t => {
  TEAM_RECORDS_FALLBACK[t.id] = { wins: t.wins, losses: t.losses }
})

function mapApiTeam(apiTeam: any): NBATeam {
  const colors = TEAM_COLORS[apiTeam.abbreviation] || { color: '#333', secondaryColor: '#666' }
  const fallbackRecord = TEAM_RECORDS_FALLBACK[apiTeam.id]
  return {
    id: apiTeam.id,
    abbreviation: apiTeam.abbreviation,
    city: apiTeam.city,
    conference: apiTeam.conference,
    division: apiTeam.division,
    full_name: apiTeam.full_name,
    name: apiTeam.name,
    wins: fallbackRecord?.wins ?? 0,
    losses: fallbackRecord?.losses ?? 0,
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
    college: apiPlayer.college || '',
    country: apiPlayer.country || '',
    draft_year: apiPlayer.draft_year ?? null,
    draft_round: apiPlayer.draft_round ?? null,
    draft_number: apiPlayer.draft_number ?? null,
    team,
    career_teams: [team.abbreviation],
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

// Valid NBA team IDs from the balldontlie API (30 NBA teams)
const NBA_TEAM_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
])

function isActiveNbaPlayer(p: any): boolean {
  if (!p.team || !p.team.id || !NBA_TEAM_IDS.has(p.team.id)) return false
  if (!p.position || p.position.trim() === '') return false
  if (!p.team.abbreviation || p.team.abbreviation.trim() === '') return false
  return true
}

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    // Use players/active endpoint (ALL-STAR tier) to fetch ONLY active NBA players
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    const maxPages = 8

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, QueryValue> = { per_page: 100 }
      if (cursor) params.cursor = cursor

      const data = await callNbaApi('players/active', params)

      if (data.data && Array.isArray(data.data)) {
        allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer))
      }

      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor

      // Small delay between pages to stay under rate limits
      if (page < maxPages - 1) await delay(100)
    }

    // Deduplicate by player ID
    const seen = new Set<number>()
    const deduped = allPlayers.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    if (deduped.length > 0) return deduped

    // Fallback: fetch team-by-team if active endpoint returned nothing
    return await fetchPlayersWithTeamFilter()
  } catch (error) {
    console.warn('Failed to fetch active players, trying fallback:', error)
    try {
      return await fetchPlayersWithTeamFilter()
    } catch {
      console.warn('All player fetching failed, using static data')
      return NBA_PLAYERS
    }
  }
}

async function fetchPlayersWithTeamFilter(): Promise<NBAPlayer[]> {
  const allPlayers: NBAPlayer[] = []
  for (const teamId of NBA_TEAM_IDS) {
    try {
      const data = await callNbaApi('players', { per_page: 50, 'team_ids[]': teamId })
      if (data.data && Array.isArray(data.data)) {
        allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer))
      }
      // Delay between team fetches to avoid rate limiting
      await delay(200)
    } catch (err: any) {
      // If rate-limited, stop fetching more teams
      if (err?.message === 'RATE_LIMITED') {
        console.warn('Rate limited during team-by-team fetch, stopping')
        break
      }
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
    let consecutiveFailures = 0

    // Fetch in small sequential batches with delays to respect rate limits
    // ALL-STAR tier: 600 req/min — we need to share budget with other endpoints
    const chunkSize = 5
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      // Abort early if we're being rate-limited
      if (consecutiveFailures >= 3) {
        console.warn(`Stopping stats fetch after ${Object.keys(results).length} players (rate limited)`)
        break
      }

      const chunk = playerIds.slice(i, i + chunkSize)
      const promises = chunk.map(async (pid) => {
        try {
          const data = await callNbaApi('season_averages', { player_id: pid, season })
          if (data.data && data.data.length > 0) {
            results[pid] = mapApiStats(data.data[0])
            consecutiveFailures = 0
          }
        } catch {
          consecutiveFailures++
        }
      })
      await Promise.all(promises)

      // Pace requests: 5 per batch, ~150ms gap = ~33 req/sec max
      await delay(150)
    }

    // Merge: fallback first, then overwrite with live data
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
      // Filter to only real NBA teams (id 1-30), excludes historical BAA teams
      const nbaTeams = data.data.filter((t: any) => t.id && NBA_TEAM_IDS.has(t.id))
      const teams = nbaTeams.map(mapApiTeam)
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
    const maxPages = 15

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

      // Delay between game pages to stay under rate limits
      if (page < maxPages - 1) await delay(100)
    }

    return records
  } catch (error) {
    console.warn('Failed to fetch team records from games API:', error)
    return {}
  }
}
