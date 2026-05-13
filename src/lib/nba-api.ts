import { NBAPlayer, NBATeam, PlayerStats, PlayoffGame, PlayoffSeries } from './types'
import { NBA_TEAMS } from './nba-data'

const loadFallbackData = () => import('./nba-data')

type DataSource = 'loading' | 'live' | 'fallback'
let _dataSource: DataSource = 'loading'
let _lastRefreshed: Date | null = null
let _lastError: string | null = null
let _apiCallCount = 0
let _apiErrorCount = 0
let _livePlayerCount = 0
export function isUsingFallbackData() { return _dataSource === 'fallback' }
export function getDataSource() { return _dataSource }
export function getLastRefreshed() { return _lastRefreshed }
export function getApiStatus() {
  return { dataSource: _dataSource, lastError: _lastError, calls: _apiCallCount, errors: _apiErrorCount, lastRefreshed: _lastRefreshed, livePlayerCount: _livePlayerCount }
}

interface ApiTeamResponse { id: number; abbreviation: string; city: string; conference: string; division: string; full_name: string; name: string; }
interface ApiPlayerResponse { id: number; first_name: string; last_name: string; position: string; height: string; weight: string | null; jersey_number: string | null; college: string; country: string; draft_year: number | null; draft_round: number | null; draft_number: number | null; team: ApiTeamResponse; }
interface ApiStatsResponse { player_id: number; player?: { id: number }; pts: number; reb: number; ast: number; min: string; games_played?: number; stl: number; blk: number; fg_pct: number; fg3_pct: number; ft_pct: number; turnover: number; }
interface ApiGameResponse { status: string; home_team: { id: number } | null; visitor_team: { id: number } | null; home_team_score: number; visitor_team_score: number; }
interface ApiPaginatedResponse<T> { data: T[]; meta?: { next_cursor?: number }; }

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!SUPABASE_PROJECT_ID || !SUPABASE_ANON_KEY) { _lastError = 'Missing VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_PUBLISHABLE_KEY — API calls will fail and fallback data will be used' }

type QueryValue = string | number | boolean | Array<string | number | boolean>
let rateLimitedUntil = 0

function createNbaApiUrl(endpoint: string, params: Record<string, QueryValue> = {}) {
  const searchParams = new URLSearchParams({ endpoint })
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) { value.forEach((item) => searchParams.append(`${key}[]`, String(item))); continue }
    searchParams.append(key, String(value))
  }
  return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/nba-api?${searchParams}`
}

async function callNbaApi(endpoint: string, params: Record<string, QueryValue> = {}) {
  if (Date.now() < rateLimitedUntil) { throw new Error('RATE_LIMITED') }
  _apiCallCount++
  const url = createNbaApiUrl(endpoint, params)
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
  if (!response.ok) { _apiErrorCount++; _lastError = `HTTP ${response.status} on ${endpoint}`; throw new Error(`API error: ${response.status}`) }
  const data = await response.json()
  if (data?.fallback) { _apiErrorCount++; _lastError = `Rate limited on ${endpoint} (status: ${data.status || 429})`; rateLimitedUntil = Date.now() + 60_000; throw new Error('RATE_LIMITED') }
  return data
}

function delay(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

const TEAM_COLORS: Record<string, { color: string; secondaryColor: string }> = {}
for (const t of NBA_TEAMS) { TEAM_COLORS[t.abbreviation] = { color: t.color, secondaryColor: t.secondaryColor } }
const TEAM_RECORDS_FALLBACK: Record<number, { wins: number; losses: number }> = {}
for (const t of NBA_TEAMS) { TEAM_RECORDS_FALLBACK[t.id] = { wins: t.wins, losses: t.losses } }
const NBA_TEAM_IDS = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30])

function mapApiTeam(apiTeam: ApiTeamResponse): NBATeam {
  const colors = TEAM_COLORS[apiTeam.abbreviation] || { color: '#333', secondaryColor: '#666' }
  const fallbackRecord = TEAM_RECORDS_FALLBACK[apiTeam.id]
  return { id: apiTeam.id, abbreviation: apiTeam.abbreviation, city: apiTeam.city, conference: apiTeam.conference, division: apiTeam.division, full_name: apiTeam.full_name, name: apiTeam.name, wins: fallbackRecord?.wins ?? 0, losses: fallbackRecord?.losses ?? 0, color: colors.color, secondaryColor: colors.secondaryColor }
}

function mapApiPlayer(apiPlayer: ApiPlayerResponse): NBAPlayer {
  const team = mapApiTeam(apiPlayer.team)
  return { id: apiPlayer.id, first_name: apiPlayer.first_name, last_name: apiPlayer.last_name, position: apiPlayer.position || 'N/A', height: apiPlayer.height || 'N/A', weight: apiPlayer.weight, jersey_number: apiPlayer.jersey_number, college: apiPlayer.college || '', country: apiPlayer.country || '', draft_year: apiPlayer.draft_year ?? null, draft_round: apiPlayer.draft_round ?? null, draft_number: apiPlayer.draft_number ?? null, team, career_teams: [team.abbreviation] }
}

function isActiveNbaPlayer(p: ApiPlayerResponse): boolean {
  if (!p.team || !p.team.id || !NBA_TEAM_IDS.has(p.team.id)) return false
  if (!p.position || p.position.trim() === '') return false
  return true
}

export async function fetchPlayers(): Promise<NBAPlayer[]> {
  try {
    const allPlayers: NBAPlayer[] = []
    let cursor: number | null = null
    for (let page = 0; page < 8; page++) {
      const params: Record<string, QueryValue> = { per_page: 100 }
      if (cursor) params.cursor = cursor
      const data = await callNbaApi('players/active', params) as ApiPaginatedResponse<ApiPlayerResponse>
      if (data.data && Array.isArray(data.data)) { allPlayers.push(...data.data.filter(isActiveNbaPlayer).map(mapApiPlayer)) }
      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
      if (page < 7) await delay(100)
    }
    const seen = new Set<number>()
    const deduped = allPlayers.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    if (deduped.length > 0) { _lastRefreshed = new Date(); _dataSource = 'live'; _livePlayerCount = deduped.length; return deduped }
    _dataSource = 'fallback'
    const { NBA_PLAYERS } = await loadFallbackData()
    return NBA_PLAYERS
  } catch {
    _dataSource = 'fallback'
    try { const { NBA_PLAYERS } = await loadFallbackData(); return NBA_PLAYERS } catch { return [] }
  }
}

export async function fetchSeasonAverages(playerIds: number[]): Promise<Record<number, PlayerStats>> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
    const results: Record<number, PlayerStats> = {}
    let consecutiveChunkFailures = 0
    const chunkSize = 5
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      if (consecutiveChunkFailures >= 3) break
      const chunk = playerIds.slice(i, i + chunkSize)
      const outcomes = await Promise.all(chunk.map(async (pid) => {
        try {
          const data = await callNbaApi('season_averages', { player_id: pid, season })
          if (data.data && data.data.length > 0) {
            const s = data.data[0]
            const minStr = String(s.min ?? '0')
            const minDecimal = minStr.includes(':') ? (() => { const [m, sec] = minStr.split(':').map(Number); return (m + (sec || 0) / 60).toFixed(1) })() : minStr
            return { pid, ok: true, stats: { player_id: s.player_id ?? pid, pts: s.pts ?? 0, reb: s.reb ?? 0, ast: s.ast ?? 0, min: minDecimal, gp: s.games_played ?? 0, stl: s.stl ?? 0, blk: s.blk ?? 0, fg_pct: s.fg_pct ?? 0, fg3_pct: s.fg3_pct ?? 0, ft_pct: s.ft_pct ?? 0, turnover: s.turnover ?? 0 } as PlayerStats }
          }
          return { pid, ok: true, stats: null }
        } catch { return { pid, ok: false, stats: null } }
      }))
      let chunkHadSuccess = false
      for (const outcome of outcomes) { if (outcome.ok && outcome.stats) { results[outcome.pid] = outcome.stats; chunkHadSuccess = true } }
      consecutiveChunkFailures = chunkHadSuccess ? 0 : consecutiveChunkFailures + 1
      if (i + chunkSize < playerIds.length) await delay(150)
    }
    const missingIds = playerIds.filter(id => !results[id])
    if (missingIds.length > 0) { const { PLAYER_STATS } = await loadFallbackData(); for (const id of missingIds) { if (PLAYER_STATS[id]) results[id] = PLAYER_STATS[id] } }
    return results
  } catch { const { PLAYER_STATS } = await loadFallbackData(); return PLAYER_STATS }
}

export async function fetchTeamRecords(): Promise<Record<number, { wins: number; losses: number }>> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
    const records: Record<number, { wins: number; losses: number }> = {}
    let cursor: number | null = null
    for (let page = 0; page < 15; page++) {
      const params: Record<string, QueryValue> = { per_page: 100, seasons: [season], postseason: false }
      if (cursor) params.cursor = cursor
      const data = await callNbaApi('games', params) as ApiPaginatedResponse<ApiGameResponse>
      if (!data.data || !Array.isArray(data.data)) break
      for (const game of data.data) {
        if (game.status !== 'Final') continue
        const homeId = game.home_team?.id; const visitorId = game.visitor_team?.id
        if (!homeId || !visitorId) continue
        if (!records[homeId]) records[homeId] = { wins: 0, losses: 0 }
        if (!records[visitorId]) records[visitorId] = { wins: 0, losses: 0 }
        if (game.home_team_score > game.visitor_team_score) { records[homeId].wins++; records[visitorId].losses++ }
        else if (game.visitor_team_score > game.home_team_score) { records[visitorId].wins++; records[homeId].losses++ }
      }
      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
      if (page < 14) await delay(100)
    }
    return records
  } catch { return {} }
}

function seriesKey(t1: number, t2: number) { return [Math.min(t1, t2), Math.max(t1, t2)].join('-') }

export async function fetchPlayoffGames(): Promise<PlayoffSeries[]> {
  try {
    const currentYear = new Date().getFullYear()
    const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
    const allGames: PlayoffGame[] = []
    let cursor: number | null = null
    for (let page = 0; page < 10; page++) {
      const params: Record<string, QueryValue> = { per_page: 100, seasons: [season], postseason: true }
      if (cursor) params.cursor = cursor
      const data = await callNbaApi('games', params)
      if (!data.data || !Array.isArray(data.data)) break
      for (const g of data.data) {
        if (!g.home_team?.id || !g.visitor_team?.id) continue
        allGames.push({ id: g.id, date: g.date ?? '', status: g.status ?? '', home_team: { id: g.home_team.id, abbreviation: g.home_team.abbreviation ?? '', full_name: g.home_team.full_name ?? '' }, visitor_team: { id: g.visitor_team.id, abbreviation: g.visitor_team.abbreviation ?? '', full_name: g.visitor_team.full_name ?? '' }, home_team_score: g.home_team_score ?? 0, visitor_team_score: g.visitor_team_score ?? 0 })
      }
      if (!data.meta?.next_cursor) break
      cursor = data.meta.next_cursor
      if (page < 9) await delay(100)
    }
    const seriesMap: Record<string, PlayoffSeries> = {}
    const sortedGames = allGames.sort((a, b) => a.date.localeCompare(b.date))
    for (const game of sortedGames) {
      const key = seriesKey(game.home_team.id, game.visitor_team.id)
      if (!seriesMap[key]) {
        const t1Id = Math.min(game.home_team.id, game.visitor_team.id)
        const t2Id = Math.max(game.home_team.id, game.visitor_team.id)
        const t1 = game.home_team.id === t1Id ? game.home_team : game.visitor_team
        const t2 = game.home_team.id === t2Id ? game.home_team : game.visitor_team
        const teamMeta1 = NBA_TEAMS.find(t => t.id === t1Id)
        const teamMeta2 = NBA_TEAMS.find(t => t.id === t2Id)
        seriesMap[key] = { team1Id: t1Id, team2Id: t2Id, team1Abbr: t1.abbreviation, team2Abbr: t2.abbreviation, team1Name: t1.full_name, team2Name: t2.full_name, team1Wins: 0, team2Wins: 0, games: [], conference: teamMeta1?.conference ?? teamMeta2?.conference ?? 'East', status: 'in_progress', winnerId: null }
      }
      seriesMap[key].games.push(game)
      if (game.status === 'Final') {
        const winnerId = game.home_team_score > game.visitor_team_score ? game.home_team.id : game.visitor_team.id
        if (winnerId === seriesMap[key].team1Id) seriesMap[key].team1Wins++
        else seriesMap[key].team2Wins++
      }
    }
    for (const series of Object.values(seriesMap)) {
      series.games.sort((a, b) => a.date.localeCompare(b.date))
      if (series.team1Wins >= 4) { series.status = 'completed'; series.winnerId = series.team1Id }
      else if (series.team2Wins >= 4) { series.status = 'completed'; series.winnerId = series.team2Id }
    }
    return Object.values(seriesMap).sort((a, b) => {
      if (a.conference !== b.conference) return a.conference === 'West' ? -1 : 1
      return (a.games[0]?.date ?? '').localeCompare(b.games[0]?.date ?? '')
    })
  } catch { return [] }
}
