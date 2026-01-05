import { getBackendClient } from "./backendClient";

describe("backendClient", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("returns null when REACT_APP_API_BASE is missing", () => {
    const prev = process.env.REACT_APP_API_BASE;
    delete process.env.REACT_APP_API_BASE;

    expect(getBackendClient()).toBeNull();

    process.env.REACT_APP_API_BASE = prev;
  });

  test("exposes expected client shape when REACT_APP_API_BASE is set", async () => {
    process.env.REACT_APP_API_BASE = "http://localhost:8000";

    global.fetch = jest.fn(async () => {
      return new Response(
        JSON.stringify({
          currency: "USD",
          range: { from: new Date().toISOString(), to: new Date().toISOString() },
          kpis: { incomeTotal: 0, expenseTotal: 10, netTotal: -10, transactionCount: 1, avgExpense: 10 }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    const client = getBackendClient();
    expect(client).not.toBeNull();

    expect(typeof client.analytics.summary).toBe("function");
    expect(typeof client.analytics.categories).toBe("function");
    expect(typeof client.analytics.timeseries).toBe("function");
    expect(typeof client.alerts.summary).toBe("function");
    expect(typeof client.transactions.recent).toBe("function");
    expect(typeof client.transactions.uploadCSV).toBe("function");

    const res = await client.analytics.summary();
    expect(res.currency).toBe("USD");

    // Ensure we hit the expected path prefix
    expect(global.fetch).toHaveBeenCalled();
    const calledUrl = String(global.fetch.mock.calls[0][0]);
    expect(calledUrl).toContain("/api/analytics/summary");
  });
});
