import { getEnv, optionalEnv } from "./env";

describe("env helper", () => {
  test("getEnv returns a frozen object with defaults", () => {
    process.env.REACT_APP_OXR_BASE_CURRENCY = "";
    process.env.REACT_APP_OXR_ENABLED = "";

    const env = getEnv();
    expect(Object.isFrozen(env)).toBe(true);
    expect(env.REACT_APP_OXR_BASE_CURRENCY).toBe("USD");
    expect(env.REACT_APP_OXR_ENABLED).toBe(true);
  });

  test("optionalEnv returns fallback when missing", () => {
    delete process.env.REACT_APP_API_BASE;
    expect(optionalEnv("REACT_APP_API_BASE", "/api")).toBe("/api");
  });
});
