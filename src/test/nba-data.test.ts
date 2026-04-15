import { describe, it, expect } from "vitest";
import {
  NBA_TEAMS,
  NBA_PLAYERS,
  PLAYER_STATS,
  getPlayersForTeam,
  searchPlayers,
  filterByPosition,
} from "@/lib/nba-data";

describe("NBA_TEAMS", () => {
  it("contains 30 NBA teams", () => {
    expect(NBA_TEAMS).toHaveLength(30);
  });

  it("has both conferences", () => {
    const conferences = new Set(NBA_TEAMS.map((t) => t.conference));
    expect(conferences).toEqual(new Set(["East", "West"]));
  });

  it("each team has required color fields", () => {
    for (const team of NBA_TEAMS) {
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("each team has unique abbreviation and id", () => {
    const ids = NBA_TEAMS.map((t) => t.id);
    const abbrs = NBA_TEAMS.map((t) => t.abbreviation);
    expect(new Set(ids).size).toBe(30);
    expect(new Set(abbrs).size).toBe(30);
  });
});

describe("NBA_PLAYERS", () => {
  it("contains players with valid team references", () => {
    const teamAbbrs = new Set(NBA_TEAMS.map((t) => t.abbreviation));
    for (const player of NBA_PLAYERS) {
      expect(teamAbbrs.has(player.team.abbreviation)).toBe(true);
    }
  });

  it("each player has a position", () => {
    for (const player of NBA_PLAYERS) {
      expect(player.position.length).toBeGreaterThan(0);
    }
  });
});

describe("PLAYER_STATS", () => {
  it("all stat values are non-negative", () => {
    for (const stats of Object.values(PLAYER_STATS)) {
      expect(stats.pts).toBeGreaterThanOrEqual(0);
      expect(stats.reb).toBeGreaterThanOrEqual(0);
      expect(stats.ast).toBeGreaterThanOrEqual(0);
      expect(stats.gp).toBeGreaterThanOrEqual(0);
      expect(stats.stl).toBeGreaterThanOrEqual(0);
      expect(stats.blk).toBeGreaterThanOrEqual(0);
    }
  });

  it("shooting percentages are between 0 and 1", () => {
    for (const stats of Object.values(PLAYER_STATS)) {
      expect(stats.fg_pct).toBeGreaterThanOrEqual(0);
      expect(stats.fg_pct).toBeLessThanOrEqual(1);
      expect(stats.fg3_pct).toBeGreaterThanOrEqual(0);
      expect(stats.fg3_pct).toBeLessThanOrEqual(1);
      expect(stats.ft_pct).toBeGreaterThanOrEqual(0);
      expect(stats.ft_pct).toBeLessThanOrEqual(1);
    }
  });
});

describe("getPlayersForTeam", () => {
  it("returns players for a valid team", () => {
    const lakersPlayers = getPlayersForTeam("LAL");
    expect(lakersPlayers.length).toBeGreaterThan(0);
    for (const p of lakersPlayers) {
      expect(p.team.abbreviation).toBe("LAL");
    }
  });

  it("returns empty array for nonexistent team", () => {
    expect(getPlayersForTeam("ZZZ")).toEqual([]);
  });
});

describe("searchPlayers", () => {
  it("finds players by first name", () => {
    const results = searchPlayers("LeBron");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].first_name).toBe("LeBron");
  });

  it("finds players by team name", () => {
    const results = searchPlayers("Lakers");
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.team.full_name).toContain("Lakers");
    }
  });

  it("is case-insensitive", () => {
    const upper = searchPlayers("LEBRON");
    const lower = searchPlayers("lebron");
    expect(upper).toEqual(lower);
  });

  it("returns empty for no match", () => {
    expect(searchPlayers("xyznonexistent123")).toEqual([]);
  });
});

describe("filterByPosition", () => {
  it("returns all players for ALL filter", () => {
    const result = filterByPosition(NBA_PLAYERS, "ALL");
    expect(result).toEqual(NBA_PLAYERS);
  });

  it("filters guards", () => {
    const guards = filterByPosition(NBA_PLAYERS, "G");
    expect(guards.length).toBeGreaterThan(0);
    for (const p of guards) {
      expect(p.position).toContain("G");
    }
  });

  it("filters forwards", () => {
    const forwards = filterByPosition(NBA_PLAYERS, "F");
    expect(forwards.length).toBeGreaterThan(0);
    for (const p of forwards) {
      expect(p.position).toContain("F");
    }
  });

  it("filters centers", () => {
    const centers = filterByPosition(NBA_PLAYERS, "C");
    expect(centers.length).toBeGreaterThan(0);
    for (const p of centers) {
      expect(p.position).toContain("C");
    }
  });
});
