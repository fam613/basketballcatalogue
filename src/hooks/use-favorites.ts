import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY_PLAYERS = 'nba-fav-players';
const STORAGE_KEY_TEAMS = 'nba-fav-teams';

function loadSet(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)));
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<number>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // Storage quota exceeded or disabled — favorites won't persist but app stays functional
  }
}

export function useFavorites() {
  const [favPlayerIds, setFavPlayerIds] = useState<Set<number>>(() => loadSet(STORAGE_KEY_PLAYERS));
  const [favTeamIds, setFavTeamIds] = useState<Set<number>>(() => loadSet(STORAGE_KEY_TEAMS));

  useEffect(() => saveSet(STORAGE_KEY_PLAYERS, favPlayerIds), [favPlayerIds]);
  useEffect(() => saveSet(STORAGE_KEY_TEAMS, favTeamIds), [favTeamIds]);

  const toggleFavPlayer = useCallback((id: number) => {
    setFavPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const toggleFavTeam = useCallback((id: number) => {
    setFavTeamIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  return { favPlayerIds, favTeamIds, toggleFavPlayer, toggleFavTeam };
}
