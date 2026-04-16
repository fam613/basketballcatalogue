import { NBAPlayer, NBATeam, PlayerStats } from './types'
import { NBA_TEAMS } from './nba-data'

const loadFallbackData = () => import('./nba-data')

let _usingFallback = false
let _lastRefreshed: Date | null = null
export function isUsingFallbackData() { return _usingFallback }
export function getLastRefreshed() { return _lastRefreshed }

interface ApiTeamResponse {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

interface ApiPlayerResponse {
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
  team: ApiTeamResponse;
}

interface ApiStatsResponse {
  player_id: number;
  player?: { id: number };
  pts: number;
  reb: number;
  ast: number;
  min: string;
  games_played?: number;
  stl: number;
  blk: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  turnover: number;
}

interface ApiGameResponse {
  status: string;
  home_team: { id: number } | null;
  visitor_team: { id: number } | null;
  home_team_score: number;
  visitor_team_score: number;
}

interface ApiPaginatedResponse<T> {
  data: T[];
  meta?: { next_cursor?: number };
}

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID

type QueryValue = string | number | boolean | Array<string | number | boolean>

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
    rateLimitedUntil = Date.now() + 60_000
    throw new Error('RATE_LIMITED')
  }
  return data
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const TEAM_COLORS: Record<string, { color: string; secondaryColor: string }> = {}
for (const t of NBA_TEAMS) {
  TEAM_COLORS[t.abbreviation] = { color: t.color, secondaryColor: t.secondaryColor }
}

const TEAM_RECORDS_FALLBACK: Record<number, { wins: number; losses: number }> = {}
for (const t of NBA_TEAMS) {
  TEAM_RECORDS_FALLBACK[t.id] = { wins: t.wins, losses: t.losses }
}

const NBA_TEAM_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
])

function mapApiTeam(apiTeam: ApiTeamResponse): NBATeam {
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

function mapApiPlayer(apiPlayer: ApiPlayerResponse): NBAPlayer {
  const team = mapApiTeam(apiPlayer.team)
  return {
    id: apiPlayer.id,
    first_name: apiPlayer.first_name,
    last_name: apiPlayer.last_name,
    position: apiPlayer.position || 'N/A',
    height: apiPlayer.height || 'N/A',
    weight: apiPlayer.weight,
    jersey_number: apiPlayer.jersey_number,
    college: apiPlayer.college || '',
    country: apiPlayer.country || '',
    draft_year: apiPlayer.draft_year ?? null,
    draft_round: apiPlayer.draft_round ?? null,
    draft_number: apiPlayer.draft_number ?? null,
    team,
    career_teams: [team.abbreviation],
  }
}

function isActiveNbaPlayer(p: ApiPlayerResponse): boolean {
  if (!p.team || !p.team.id || !NBA_TEAM_IDS.has(p.team.id)) return false
  if (!p.position || p.position.trim() === '') return false
  return true
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function mapAggregatedStats(playerId: number, statLines: ApiStatsResponse[]): PlayerStats {
  const minutes = statLines
    .map((line) => Number.parseFloat(String(line.min ?? '0')))
    .filter((v) => Number.isFinite(v))
  return {
    player_id: playerId,
    pts: average(statLines.map((l) => Number(l.pts ?? 0))),
    reb: average(statLines.map((l) => Number(l.reb ?? 0))),
    ast: average(statLines.map((l) => Number(l.ast ?? 0))),
    min: minutes.length ? average(minutes).toFixed(1) : '0',
    gp: statLines.length,
    stl: average(statLines.map((l) => Number(l.stl ?? 0))),
    blk: average(statLines.map((l) => Number(l.blk ?? 0))),
    fg_pct: average(statLines.map((l) => Number(l.fg_pct ?? 0))),
    fg3_pct: average(statLines.map((l) => Number(l.fg3_pct ?? 0))),
    ft_pct: average(statLines.map((l) => Number(l.ft_pct ?? 0))),
    turnover: average(statLines.map((l) => Number(l.turnover ?? 0))),
  }
}

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    const maxPages = 8

    for (let page = 0; page < maxPages; page++) {
      const params: Record<string, QueryValue> = { per_page: 100 }
      if (cursor) params.cursor = cursor

      const data = await callNbaApi('players/active', params) as ApiPaginatedResponse<ApiPlayerResponse>

      if (data.data && Array.isArray(data.data)) {
        allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer))
      }

      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
      if (page < maxPages - 1) await delay(100)
    }

    const seen = new Set<number>()
    const deduped = allPlayers.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    if (deduped.length > 0) {
      _lastRefreshed = new Date()
      _usingFallback = false
      return deduped
    }

    _usingFallback = true
    const { NBA_PLAYERS } = await loadFallbackData()
    return NBA_PLAYERS
  } catch {
    _usingFallback = true
    try {
      const { NBA_PLAYERS } = await loadFallbackData()
      return NBA_PLAYERS
    } catch {
      return []
    }
  }
}

export async function fetchSeasonAverages(playerIds: number[]): Promise<Record<number, PlayerStats>> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1

    const results: Record<number, PlayerStats> = {}

    // Batch via the stats endpoint — one call per chunk of 25 players
    const chunkSize = 25
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize)
      try {
        const playerStatLines: Record<number, ApiStatsResponse[]> = {}
        let cursor: number | null = null
        const maxPages = 10

        for (let page = 0; page < maxPages; page++) {
          const params: Record<string, QueryValue> = {
            per_page: 100,
            seasons: [season],
            player_ids: chunk,
          }
          if (cursor) params.cursor = cursor

          const data = await callNbaApi('stats', params) as ApiPaginatedResponse<ApiStatsResponse>

          if (!data.data || !Array.isArray(data.data)) break

          for (const line of data.data) {
            const pid = line.player?.id ?? line.player_id
            if (!pid) continue
            if (!playerStatLines[pid]) playerStatLines[pid] = []
            playerStatLines[pid].push(line)
          }

          if (!data.meta?.next_cursor) break
          cursor = data.meta.next_cursor
        }

        for (const [pid, lines] of Object.entries(playerStatLines)) {
          results[Number(pid)] = mapAggregatedStats(Number(pid), lines)
        }
      } catch {
        // skip chunk failures
      }
      if (i + chunkSize < playerIds.length) await delay(100)
    }

    // Only load fallback for players missing stats
    const missingIds = playerIds.filter(id => !results[id])
    if (missingIds.length > 0) {
      const { PLAYER_STATS } = await loadFallbackData()
      for (const id of missingIds) {
        if (PLAYER_STATS[id]) results[id] = PLAYER_STATS[id]
      }
    }

    return results
  } catch {
    const { PLAYER_STATS } = await loadFallbackData()
    return PLAYER_STATS
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

      const data = await callNbaApi('games', params) as ApiPaginatedResponse<ApiGameResponse>

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
        } else if (game.visitor_team_score > game.home_team_score) {
          records[visitorId].wins++
          records[homeId].losses++
        }
      }

      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
      if (page < maxPages - 1) await delay(100)
    }

    return records
  } catch {
    return {}
  }
}
