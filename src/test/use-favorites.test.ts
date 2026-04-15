import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/use-favorites";

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty favorites", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favPlayerIds.size).toBe(0);
    expect(result.current.favTeamIds.size).toBe(0);
  });

  it("toggles a favorite player on and off", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavPlayer(42));
    expect(result.current.favPlayerIds.has(42)).toBe(true);

    act(() => result.current.toggleFavPlayer(42));
    expect(result.current.favPlayerIds.has(42)).toBe(false);
  });

  it("toggles a favorite team on and off", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavTeam(7));
    expect(result.current.favTeamIds.has(7)).toBe(true);

    act(() => result.current.toggleFavTeam(7));
    expect(result.current.favTeamIds.has(7)).toBe(false);
  });

  it("tracks multiple favorites simultaneously", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavPlayer(1);
      result.current.toggleFavPlayer(2);
      result.current.toggleFavPlayer(3);
    });

    expect(result.current.favPlayerIds.size).toBe(3);
    expect(result.current.favPlayerIds.has(1)).toBe(true);
    expect(result.current.favPlayerIds.has(2)).toBe(true);
    expect(result.current.favPlayerIds.has(3)).toBe(true);
  });

  it("persists favorites to localStorage", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavPlayer(10));
    act(() => result.current.toggleFavTeam(5));

    const storedPlayers = JSON.parse(localStorage.getItem("nba-fav-players") || "[]");
    const storedTeams = JSON.parse(localStorage.getItem("nba-fav-teams") || "[]");

    expect(storedPlayers).toContain(10);
    expect(storedTeams).toContain(5);
  });

  it("restores favorites from localStorage", () => {
    localStorage.setItem("nba-fav-players", JSON.stringify([1, 2, 3]));
    localStorage.setItem("nba-fav-teams", JSON.stringify([10, 20]));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favPlayerIds.size).toBe(3);
    expect(result.current.favPlayerIds.has(1)).toBe(true);
    expect(result.current.favTeamIds.size).toBe(2);
    expect(result.current.favTeamIds.has(10)).toBe(true);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("nba-fav-players", "not-valid-json");

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favPlayerIds.size).toBe(0);
  });
});
