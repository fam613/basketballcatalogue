import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to light theme when no preference stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggles theme from light to dark", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles theme back from dark to light", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(localStorage.getItem("nba-cards-theme")).toBe("dark");

    act(() => result.current.toggleTheme());
    expect(localStorage.getItem("nba-cards-theme")).toBe("light");
  });

  it("restores theme from localStorage", () => {
    localStorage.setItem("nba-cards-theme", "dark");

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});
