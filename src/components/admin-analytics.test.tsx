import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AdminAnalytics } from "./admin-analytics";

const { apiFetch, getConfiguredDataMode, useStoreSelector } = vi.hoisted(() => ({ apiFetch: vi.fn(), getConfiguredDataMode: vi.fn(), useStoreSelector: vi.fn() }));

vi.mock("@/lib/fetch", () => ({ apiFetch, getConfiguredDataMode }));
vi.mock("@/hooks/use-store", () => ({ useStoreSelector }));

const session = { id: "admin", name: "Admin", email: "admin@example.test", role: "CENTER_ADMIN" as const, preferredLanguage: "en" as const, centerIds: ["center-1"] };
const payload = {
  history: [{ month: "2025-01", count: 11 }, { month: "2025-02", count: 12 }],
  forecasts: [{
    id: "prediction-1", modelVersion: "aggregate-observation-volume-v1", predictionType: "aggregate_monthly_observation_volume",
    predictionValue: { predicted_count: 15, month: "2025-03", model_version: "aggregate-observation-volume-v1", input_data_cutoff: "2025-02", training_data_cutoff: "2024-12", data_source: "sqlite_aggregate_export", confidence: null, note: "Aggregate workload only" },
    generatedAt: "2025-03-01T00:00:00.000Z", inputDataCutoff: "2025-02-28T00:00:00.000Z", explanation: {},
  }],
  evaluation: { trained_at: "2025-01-01T00:00:00.000Z", data_cutoff: "2024-12", metrics: { test_start: "2024-10", test_end: "2024-12", candidate_mae: 1.2, candidate_rmse: 1.5 } },
  historyMonths: 2,
};

describe("admin forecast dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const selected = [{ riskData: [] }, [], [], []];
    let index = 0;
    useStoreSelector.mockImplementation(() => selected[index++ % selected.length]);
    getConfiguredDataMode.mockResolvedValue("sqlite");
    apiFetch.mockResolvedValue(payload);
  });

  it("renders API actuals separately from the forecast and its evaluation metadata", async () => {
    render(<AdminAnalytics session={session} />);
    expect(await screen.findByText(/2025-02: historical actual 12; no forecast/)).toBeTruthy();
    expect(screen.getByText(/2025-03: no actual; forecast 15/)).toBeTruthy();
    expect(screen.getByText("Historical")).toBeTruthy();
    expect(screen.getByText("Forecast (ML)")).toBeTruthy();
    expect(screen.getByText(/Last evaluation: 2025-01/)).toBeTruthy();
    expect(screen.getByText(/Uncertainty interval: unavailable/)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/analytics/forecast");
  });

  it("shows an API error state instead of inventing predictions", async () => {
    apiFetch.mockRejectedValue(new Error("Forecast service unavailable"));
    render(<AdminAnalytics session={session} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Forecast service unavailable");
    expect(screen.queryByText(/forecast \d+/i)).toBeNull();
  });

  it("refreshes database history after an observation save without generating a forecast", async () => {
    render(<AdminAnalytics session={session} />);
    await screen.findByText(/2025-02: historical actual 12; no forecast/);
    act(() => window.dispatchEvent(new CustomEvent("balsathi:observations-updated")));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(apiFetch).not.toHaveBeenCalledWith("/api/v1/analytics/forecast", { method: "POST" });
  });
});
