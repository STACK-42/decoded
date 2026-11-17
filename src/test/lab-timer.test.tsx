import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LabTimer } from "@/components/lesson/LabTimer";

describe("LabTimer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("shows hours, minutes and seconds", () => {
    render(<LabTimer id="long/lab" />);
    expect(screen.getByText("00:00:00")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /start the lab/i }));
    act(() => vi.advanceTimersByTime((2 * 3600 + 5 * 60 + 9) * 1000));
    expect(screen.getByText("02:05:09")).toBeTruthy();
  });

  it("counts while running, holds while paused, and survives a remount", () => {
    const { unmount } = render(<LabTimer id="os/lab" />);
    fireEvent.click(screen.getByRole("button", { name: /start the lab/i }));
    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText("00:01:05")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^pause$/i }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("00:01:05")).toBeTruthy();
    unmount();

    render(<LabTimer id="os/lab" />);
    expect(screen.getByText("00:01:05")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByText("00:00:00")).toBeTruthy();
    expect(localStorage.getItem("decoded:lab-timer:os/lab")).toBeNull();
  });
});
