import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/use-favorites";

describe("useFavorites", () => {
  beforeEach(() => { localStorage.clear(); });

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

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavPlayer(10));
    const stored = JSON.parse(localStorage.getItem("nba-fav-players") || "[]");
    expect(stored).toContain(10);
  });

  it("restores from localStorage", () => {
    localStorage.setItem("nba-fav-players", JSON.stringify([1, 2, 3]));
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favPlayerIds.size).toBe(3);
  });

  it("handles corrupted localStorage", () => {
    localStorage.setItem("nba-fav-players", "not-json");
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favPlayerIds.size).toBe(0);
  });
});
