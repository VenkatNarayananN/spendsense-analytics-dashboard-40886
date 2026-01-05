import { createApiClient, ApiError } from "./apiClient";

describe("apiClient", () => {
  test("times out and returns ApiError with isTimeout", async () => {
    const client = createApiClient("", { timeoutMs: 5, maxRetries: 0 });

    global.fetch = jest.fn(() => new Promise(() => {})); // never resolves

    await expect(client.get("https://example.com/test")).rejects.toBeInstanceOf(ApiError);

    try {
      await client.get("https://example.com/test");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.isTimeout).toBe(true);
      expect(e.code).toBe("TIMEOUT");
    }
  });

  test("retries idempotent GET on 500 and eventually succeeds", async () => {
    const client = createApiClient("", { timeoutMs: 1000, maxRetries: 2 });

    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls < 2) {
        return new Response(JSON.stringify({ message: "fail" }), {
          status: 500,
          headers: { "content-type": "application/json", "x-request-id": "abc" }
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const res = await client.get("https://example.com/retry");
    expect(res).toEqual({ ok: true });
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  test("does not retry non-idempotent POST by default", async () => {
    const client = createApiClient("", { timeoutMs: 1000, maxRetries: 2 });

    let calls = 0;
    global.fetch = jest.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: "server down" }), {
        status: 503,
        headers: { "content-type": "application/json" }
      });
    });

    await expect(client.post("https://example.com/items", { a: 1 })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });
});
