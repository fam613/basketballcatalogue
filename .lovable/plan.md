

# Live Auto-Updating NBA Stats

## Current State
The app uses hardcoded data in `src/lib/nba-data.ts` — static stats that never change.

## Goal
Stats should update automatically after every game, so your son always sees the latest numbers.

## Approach: balldontlie.io API

The balldontlie.io API now requires an API key (free tier available — 30 requests/min, $0/month). The free tier covers players, teams, stats, and games endpoints, which is everything we need.

### What needs to happen

1. **Get a free API key** — You'll create a free account at [balldontlie.io](https://www.balldontlie.io) and grab your API key. I'll securely store it in the project.

2. **Build an API service layer** — Replace the hardcoded data with live API calls:
   - Fetch all active players (paginated)
   - Fetch season averages (PPG, RPG, APG, etc.) for each player
   - Fetch team standings (W-L records)
   - All routed through a Supabase Edge Function to keep the API key secure

3. **Add React Query for smart caching** — Install `@tanstack/react-query` to:
   - Cache data so the app loads instantly on repeat visits
   - Auto-refetch every 30 minutes (configurable) so stats stay fresh after games
   - Show cached data while refreshing in the background (no loading spinners after first load)

4. **Keep hardcoded data as fallback** — If the API is down or rate-limited, the app still works with the sample data already built in.

### Technical details

- **Edge Function** (`supabase/functions/nba-api/index.ts`): Proxies requests to balldontlie.io with the API key server-side. Endpoints: `/players`, `/season_averages`, `/teams`.
- **API service** (`src/lib/nba-api.ts`): Client-side functions that call the edge function and transform responses into our existing `NBAPlayer`/`PlayerStats` types.
- **React Query hooks** (`src/hooks/use-nba-data.ts`): `usePlayersQuery()`, `usePlayerStatsQuery()`, `useTeamsQuery()` with `staleTime: 30min` and `refetchInterval: 30min`.
- **Update Index.tsx and components** to use the hooks instead of importing from `nba-data.ts`.

### What you'll need to do
Sign up for a free account at balldontlie.io — I'll prompt you to paste the API key when we're ready.

