import { useQuery } from '@tanstack/react-query'
import { fetchPlayers, fetchSeasonAverages, fetchTeams, fetchTeamRecords } from '@/lib/nba-api'
import { NBAPlayer, NBATeam, PlayerStats } from '@/lib/types'
import { NBA_PLAYERS, NBA_TEAMS, PLAYER_STATS } from '@/lib/nba-data'

const THIRTY_MINUTES = 30 * 60 * 1000

export function usePlayersQuery() {
  return useQuery<NBAPlayer[]>({
    queryKey: ['nba-players'],
    queryFn: fetchPlayers,
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
    placeholderData: NBA_PLAYERS,
  })
}

export function usePlayerStatsQuery(playerIds: number[]) {
  return useQuery<Record<number, PlayerStats>>({
    queryKey: ['nba-stats', playerIds],
    queryFn: () => fetchSeasonAverages(playerIds),
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
    placeholderData: PLAYER_STATS,
    enabled: playerIds.length > 0,
  })
}

export function useTeamsQuery() {
  return useQuery<NBATeam[]>({
    queryKey: ['nba-teams'],
    queryFn: fetchTeams,
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
    placeholderData: NBA_TEAMS,
  })
}

export function useTeamRecordsQuery() {
  return useQuery<Record<number, { wins: number; losses: number }>>({
    queryKey: ['nba-team-records'],
    queryFn: fetchTeamRecords,
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
    placeholderData: {},
  })
}
