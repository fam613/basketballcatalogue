import { useQuery } from '@tanstack/react-query'
import { fetchPlayers, fetchSeasonAverages, fetchTeamRecords } from '@/lib/nba-api'
import { NBAPlayer, PlayerStats } from '@/lib/types'

const THIRTY_MINUTES = 30 * 60 * 1000

export function usePlayersQuery() {
  return useQuery<NBAPlayer[]>({
    queryKey: ['nba-players'],
    queryFn: fetchPlayers,
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
  })
}

export function usePlayerStatsQuery(playerIds: number[]) {
  return useQuery<Record<number, PlayerStats>>({
    queryKey: ['nba-stats', playerIds],
    queryFn: () => fetchSeasonAverages(playerIds),
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
    enabled: playerIds.length > 0,
  })
}

export function useTeamRecordsQuery() {
  return useQuery<Record<number, { wins: number; losses: number }>>({
    queryKey: ['nba-team-records'],
    queryFn: fetchTeamRecords,
    staleTime: THIRTY_MINUTES,
    refetchInterval: THIRTY_MINUTES,
  })
}
