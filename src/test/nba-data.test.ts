import { describe, it, expect } from "vitest";
import { NBA_TEAMS, NBA_PLAYERS, PLAYER_STATS, getPlayersForTeam } from "@/lib/nba-data";

describe("NBA_TEAMS", () => {
  it("contains 30 NBA teams", () => {
    expect(NBA_TEAMS).toHaveLength(30);
  });

  it("has both conferences", () => {
    const conferences = new Set(NBA_TEAMS.map((t) => t.conference));
    expect(conferences).toEqual(new Set(["East", "West"]));
  });

  it("each team has valid color fields", () => {
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
  it("every player has a non-empty position", () => {
    for (const player of NBA_PLAYERS) {
      expect(player.position.length).toBeGreaterThan(0);
    }
  });

  it("no player has null jersey_number", () => {
    for (const player of NBA_PLAYERS) {
      expect(player.jersey_number).not.toBeNull();
    }
  });

  it("no player has null weight", () => {
    for (const player of NBA_PLAYERS) {
      expect(player.weight).not.toBeNull();
    }
  });

  it("every player has a valid team", () => {
    const teamAbbrs = new Set(NBA_TEAMS.map((t) => t.abbreviation));
    for (const player of NBA_PLAYERS) {
      expect(teamAbbrs.has(player.team.abbreviation)).toBe(true);
    }
  });
});

describe("PLAYER_STATS", () => {
  it("all stat values are non-negative", () => {
    for (const stats of Object.values(PLAYER_STATS)) {
      expect(stats.pts).toBeGreaterThanOrEqual(0);
      expect(stats.reb).toBeGreaterThanOrEqual(0);
      expect(stats.ast).toBeGreaterThanOrEqual(0);
    }
  });

  it("shooting percentages are between 0 and 1", () => {
    for (const stats of Object.values(PLAYER_STATS)) {
      expect(stats.fg_pct).toBeGreaterThanOrEqual(0);
      expect(stats.fg_pct).toBeLessThanOrEqual(1);
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
