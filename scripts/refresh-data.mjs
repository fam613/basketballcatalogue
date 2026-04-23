#!/usr/bin/env node

/**
 * Refresh fallback data from the balldontlie API.
 *
 * Usage:
 *   node scripts/refresh-data.mjs
 *
 * Requires VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_PUBLISHABLE_KEY
 * to be set in .env (reads them automatically).
 *
 * Hits the Supabase Edge Function which proxies to balldontlie.
 * Writes the result to src/lib/nba-data.ts.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
const envPath = resolve(ROOT, '.env')
const envVars = {}
try {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=["']?(.+?)["']?\s*$/)
    if (match) envVars[match[1]] = match[2]
  }
} catch {
  console.error('Could not read .env — make sure it exists at the project root')
  process.exit(1)
}

const PROJECT_ID = envVars.VITE_SUPABASE_PROJECT_ID
const API_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY
if (!PROJECT_ID || !API_KEY) {
  console.error('Missing VITE_SUPABASE_PROJECT_ID or VITE_SUPABASE_PUBLISHABLE_KEY in .env')
  process.exit(1)
}

const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/nba-api`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(endpoint, params = {}) {
  const url = new URL(BASE)
  url.searchParams.set('endpoint', endpoint)
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      v.forEach((item) => url.searchParams.append(`${k}[]`, String(item)))
    } else {
      url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data?.fallback) throw new Error('API rate-limited')
  return data
}

// Team colors & conference data (static — the API doesn't provide these)
const TEAM_META = {
  ATL: { color: '#E03A3E', secondaryColor: '#C1D32F', conference: 'East', division: 'Southeast' },
  BOS: { color: '#007A33', secondaryColor: '#BA9653', conference: 'East', division: 'Atlantic' },
  BKN: { color: '#000000', secondaryColor: '#FFFFFF', conference: 'East', division: 'Atlantic' },
  CHA: { color: '#1D1160', secondaryColor: '#00788C', conference: 'East', division: 'Southeast' },
  CHI: { color: '#CE1141', secondaryColor: '#000000', conference: 'East', division: 'Central' },
  CLE: { color: '#860038', secondaryColor: '#FDBB30', conference: 'East', division: 'Central' },
  DAL: { color: '#00538C', secondaryColor: '#002B5E', conference: 'West', division: 'Southwest' },
  DEN: { color: '#0E2240', secondaryColor: '#FEC524', conference: 'West', division: 'Northwest' },
  DET: { color: '#C8102E', secondaryColor: '#1D42BA', conference: 'East', division: 'Central' },
  GSW: { color: '#1D428A', secondaryColor: '#FFC72C', conference: 'West', division: 'Pacific' },
  HOU: { color: '#CE1141', secondaryColor: '#000000', conference: 'West', division: 'Southwest' },
  IND: { color: '#002D62', secondaryColor: '#FDBB30', conference: 'East', division: 'Central' },
  LAC: { color: '#C8102E', secondaryColor: '#1D428A', conference: 'West', division: 'Pacific' },
  LAL: { color: '#552583', secondaryColor: '#FDB927', conference: 'West', division: 'Pacific' },
  MEM: { color: '#5D76A9', secondaryColor: '#12173F', conference: 'West', division: 'Southwest' },
  MIA: { color: '#98002E', secondaryColor: '#F9A01B', conference: 'East', division: 'Southeast' },
  MIL: { color: '#00471B', secondaryColor: '#EEE1C6', conference: 'East', division: 'Central' },
  MIN: { color: '#0C2340', secondaryColor: '#236192', conference: 'West', division: 'Northwest' },
  NOP: { color: '#0C2340', secondaryColor: '#C8102E', conference: 'West', division: 'Southwest' },
  NYK: { color: '#006BB6', secondaryColor: '#F58426', conference: 'East', division: 'Atlantic' },
  OKC: { color: '#007AC1', secondaryColor: '#EF6100', conference: 'West', division: 'Northwest' },
  ORL: { color: '#0077C0', secondaryColor: '#C4CED4', conference: 'East', division: 'Southeast' },
  PHI: { color: '#006BB6', secondaryColor: '#ED174C', conference: 'East', division: 'Atlantic' },
  PHX: { color: '#1D1160', secondaryColor: '#E56020', conference: 'West', division: 'Pacific' },
  POR: { color: '#E03A3E', secondaryColor: '#000000', conference: 'West', division: 'Northwest' },
  SAC: { color: '#5A2D81', secondaryColor: '#63727A', conference: 'West', division: 'Pacific' },
  SAS: { color: '#C4CED4', secondaryColor: '#000000', conference: 'West', division: 'Southwest' },
  TOR: { color: '#CE1141', secondaryColor: '#000000', conference: 'East', division: 'Atlantic' },
  UTA: { color: '#002B5C', secondaryColor: '#00471B', conference: 'West', division: 'Northwest' },
  WAS: { color: '#002B5C', secondaryColor: '#E31837', conference: 'East', division: 'Southeast' },
}

const NBA_TEAM_IDS = new Set(Array.from({ length: 30 }, (_, i) => i + 1))

// ---------------------------------------------------------------------------
// Step 1: Fetch all active players
// ---------------------------------------------------------------------------
async function fetchAllPlayers() {
  console.log('Fetching active players...')
  const all = []
  let cursor = null
  for (let page = 0; page < 10; page++) {
    const params = { per_page: 100 }
    if (cursor) params.cursor = cursor
    const data = await api('players/active', params)
    if (data.data) {
      const valid = data.data.filter(
        (p) => p.team?.id && NBA_TEAM_IDS.has(p.team.id) && p.position?.trim()
      )
      all.push(...valid)
    }
    if (!data.meta?.next_cursor) break
    cursor = data.meta.next_cursor
    await delay(150)
    process.stdout.write(`  page ${page + 1}: ${all.length} players so far\r`)
  }
  // Deduplicate
  const seen = new Set()
  const deduped = all.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
  console.log(`\n  Total: ${deduped.length} active players`)
  return deduped
}

// ---------------------------------------------------------------------------
// Step 2: Fetch season averages
// ---------------------------------------------------------------------------
async function fetchSeasonAverages(playerIds) {
  const currentYear = new Date().getFullYear()
  const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
  console.log(`Fetching season averages for ${season}-${season + 1}...`)
  console.log(`  Pacing: 50 req/min (well under ALL-STAR 60/min limit)`)
  console.log(`  Expected runtime: ~${Math.ceil(playerIds.length * 1.2 / 60)} minutes`)

  const stats = {}
  let done = 0
  let consecutiveFailures = 0
  let requestDelay = 1200 // 50 req/min — safely under ALL-STAR's 60/min

  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i]
    try {
      const data = await api('season_averages', { player_id: pid, season })
      if (data.data?.length > 0) {
        stats[pid] = data.data[0]
      }
      consecutiveFailures = 0
    } catch (err) {
      consecutiveFailures++

      // Progressive backoff: slow down permanently after rate limits
      if (consecutiveFailures >= 2) {
        console.log(`\n  Rate limited — cooling down 90s and slowing rate...`)
        await delay(90_000)
        // Permanently reduce rate for the rest of the run
        requestDelay = Math.min(requestDelay + 500, 3000)
        console.log(`  New rate: ${Math.floor(60000 / requestDelay)} req/min`)
        consecutiveFailures = 0
        i-- // retry this player
        continue
      }
    }
    done++
    if (done % 25 === 0 || done === playerIds.length) {
      const pct = ((Object.keys(stats).length / playerIds.length) * 100).toFixed(1)
      process.stdout.write(`  ${done}/${playerIds.length} processed, ${Object.keys(stats).length} with stats (${pct}%)        \r`)
    }
    await delay(requestDelay)
  }
  console.log(`\n  Got stats for ${Object.keys(stats).length}/${playerIds.length} players`)
  return stats
}

// ---------------------------------------------------------------------------
// Step 3: Fetch team records from games
// ---------------------------------------------------------------------------
async function fetchTeamRecords() {
  const currentYear = new Date().getFullYear()
  const season = new Date().getMonth() >= 9 ? currentYear : currentYear - 1
  console.log(`Fetching team records for ${season}-${season + 1}...`)

  const records = {}
  let cursor = null
  let gameCount = 0
  for (let page = 0; page < 15; page++) {
    const params = { per_page: 100, seasons: [season], postseason: false }
    if (cursor) params.cursor = cursor
    const data = await api('games', params)
    if (!data.data) break
    for (const g of data.data) {
      if (g.status !== 'Final') continue
      const hid = g.home_team?.id
      const vid = g.visitor_team?.id
      if (!hid || !vid) continue
      if (!records[hid]) records[hid] = { wins: 0, losses: 0 }
      if (!records[vid]) records[vid] = { wins: 0, losses: 0 }
      if (g.home_team_score > g.visitor_team_score) {
        records[hid].wins++
        records[vid].losses++
      } else if (g.visitor_team_score > g.home_team_score) {
        records[vid].wins++
        records[hid].losses++
      }
      gameCount++
    }
    if (!data.meta?.next_cursor) break
    cursor = data.meta.next_cursor
    await delay(150)
    process.stdout.write(`  ${gameCount} games processed\r`)
  }
  console.log(`\n  ${gameCount} games → ${Object.keys(records).length} teams`)
  return records
}

// ---------------------------------------------------------------------------
// Step 4: Fetch teams from API
// ---------------------------------------------------------------------------
async function fetchTeams() {
  console.log('Fetching teams...')
  const data = await api('teams')
  if (!data.data) return []
  return data.data.filter((t) => t.id && NBA_TEAM_IDS.has(t.id))
}

// ---------------------------------------------------------------------------
// Step 5: Generate nba-data.ts
// ---------------------------------------------------------------------------
function generateFile(teams, records, players, stats) {
  const lines = []
  lines.push(`import { NBAPlayer, NBATeam, PlayerStats } from './types'`)
  lines.push('')
  lines.push(`export const DATA_LAST_UPDATED = '${new Date().toISOString()}'`)
  lines.push('')

  // NBA_TEAMS
  lines.push('export const NBA_TEAMS: NBATeam[] = [')
  for (const t of teams) {
    const meta = TEAM_META[t.abbreviation] || { color: '#333', secondaryColor: '#666', conference: 'East', division: '' }
    const rec = records[t.id] || { wins: 0, losses: 0 }
    lines.push(`  { id: ${t.id}, abbreviation: ${JSON.stringify(t.abbreviation)}, city: ${JSON.stringify(t.city)}, conference: ${JSON.stringify(meta.conference)}, division: ${JSON.stringify(meta.division)}, full_name: ${JSON.stringify(t.full_name)}, name: ${JSON.stringify(t.name)}, wins: ${rec.wins}, losses: ${rec.losses}, color: ${JSON.stringify(meta.color)}, secondaryColor: ${JSON.stringify(meta.secondaryColor)} },`)
  }
  lines.push(']')
  lines.push('')

  // Build team lookup for player entries
  const teamById = {}
  for (const t of teams) {
    const meta = TEAM_META[t.abbreviation] || { color: '#333', secondaryColor: '#666', conference: 'East', division: '' }
    const rec = records[t.id] || { wins: 0, losses: 0 }
    teamById[t.id] = { id: t.id, abbreviation: t.abbreviation, city: t.city, conference: meta.conference, division: meta.division, full_name: t.full_name, name: t.name, wins: rec.wins, losses: rec.losses, color: meta.color, secondaryColor: meta.secondaryColor }
  }

  // NBA_PLAYERS (sorted by team, then last name)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.team.id !== b.team.id) return a.team.id - b.team.id
    return (a.last_name || '').localeCompare(b.last_name || '')
  })

  lines.push('export const NBA_PLAYERS: NBAPlayer[] = [')
  for (const p of sortedPlayers) {
    const team = teamById[p.team.id]
    if (!team) continue
    const jersey = p.jersey_number != null ? JSON.stringify(String(p.jersey_number)) : 'null'
    const weight = p.weight != null ? JSON.stringify(String(p.weight)) : 'null'
    const college = JSON.stringify(p.college || '')
    const country = JSON.stringify(p.country || '')
    const dy = p.draft_year ?? 'null'
    const dr = p.draft_round ?? 'null'
    const dn = p.draft_number ?? 'null'
    lines.push(`  { id: ${p.id}, first_name: ${JSON.stringify(p.first_name)}, last_name: ${JSON.stringify(p.last_name)}, position: ${JSON.stringify(p.position)}, height: ${JSON.stringify(p.height || 'N/A')}, weight: ${weight}, jersey_number: ${jersey}, college: ${college}, country: ${country}, draft_year: ${dy}, draft_round: ${dr}, draft_number: ${dn}, team: ${JSON.stringify(team)} },`)
  }
  lines.push(']')
  lines.push('')

  // PLAYER_STATS
  const playerIdSet = new Set(sortedPlayers.map((p) => p.id))
  lines.push('export const PLAYER_STATS: Record<number, PlayerStats> = {')
  for (const [pid, s] of Object.entries(stats)) {
    if (!playerIdSet.has(Number(pid))) continue
    const pts = (s.pts ?? 0).toFixed(1)
    const reb = (s.reb ?? 0).toFixed(1)
    const ast = (s.ast ?? 0).toFixed(1)
    // Convert "MM:SS" from API to decimal minutes string ("22.8")
    const minutesPlayed = (() => {
      const raw = String(s.min ?? '0')
      if (raw.includes(':')) {
        const [m, sec] = raw.split(':').map(Number)
        return (m + (sec || 0) / 60).toFixed(1)
      }
      return (parseFloat(raw) || 0).toFixed(1)
    })()
    const min = JSON.stringify(minutesPlayed)
    const gp = s.games_played ?? 0
    const stl = (s.stl ?? 0).toFixed(1)
    const blk = (s.blk ?? 0).toFixed(1)
    const fg = (s.fg_pct ?? 0).toFixed(3)
    const fg3 = (s.fg3_pct ?? 0).toFixed(3)
    const ft = (s.ft_pct ?? 0).toFixed(3)
    const to = (s.turnover ?? 0).toFixed(1)
    lines.push(`  ${pid}: { player_id: ${pid}, pts: ${pts}, reb: ${reb}, ast: ${ast}, min: ${min}, gp: ${gp}, stl: ${stl}, blk: ${blk}, fg_pct: ${fg}, fg3_pct: ${fg3}, ft_pct: ${ft}, turnover: ${to} },`)
  }
  lines.push('}')
  lines.push('')

  lines.push(`export function getPlayersForTeam(teamAbbr: string): NBAPlayer[] {`)
  lines.push(`  return NBA_PLAYERS.filter(p => p.team.abbreviation === teamAbbr);`)
  lines.push(`}`)
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== NBA Fallback Data Refresh ===\n')
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  const [teams, rawPlayers] = await Promise.all([fetchTeams(), fetchAllPlayers()])
  const records = await fetchTeamRecords()
  const playerIds = rawPlayers.map((p) => p.id)
  const stats = await fetchSeasonAverages(playerIds)

  const playerCount = rawPlayers.length
  const statsCount = Object.keys(stats).length
  const teamCount = Object.keys(records).length

  // Validate: don't overwrite good data with bad data
  if (playerCount < 100) {
    console.error(`\nABORTED: Only ${playerCount} players fetched (expected 400+). API may be down.`)
    console.error('Keeping existing fallback data unchanged.')
    process.exit(1)
  }
  if (teams.length < 30) {
    console.error(`\nABORTED: Only ${teams.length} teams fetched (expected 30). API may be down.`)
    console.error('Keeping existing fallback data unchanged.')
    process.exit(1)
  }

  const outPath = resolve(ROOT, 'src/lib/nba-data.ts')
  const backupPath = resolve(ROOT, 'src/lib/nba-data.backup.ts')

  // Keep a backup of the previous data
  try {
    const existing = readFileSync(outPath, 'utf-8')
    writeFileSync(backupPath, existing, 'utf-8')
    console.log(`\nBacked up previous data to nba-data.backup.ts`)
  } catch {
    // No existing file to back up — that's fine
  }

  console.log('Generating nba-data.ts...')
  const content = generateFile(teams, records, rawPlayers, stats)
  writeFileSync(outPath, content, 'utf-8')

  console.log(`\nDone! Wrote ${playerCount} players, ${statsCount} stat lines, ${teamCount} team records`)
  console.log(`Output: ${outPath}`)
  console.log(`Data timestamp: ${new Date().toISOString()}`)

  // Report freshness
  const playersWithStats = playerIds.filter(id => stats[id]).length
  const pct = ((playersWithStats / playerCount) * 100).toFixed(1)
  console.log(`\nStat coverage: ${playersWithStats}/${playerCount} players (${pct}%)`)
  if (playersWithStats < playerCount * 0.5) {
    console.warn('WARNING: Less than 50% of players have stats — API may be partially down')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
