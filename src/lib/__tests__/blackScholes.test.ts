// Tests for Black-Scholes option pricing in src/lib/blackScholes.ts

import { describe, it, expect } from "vitest";
import { blackScholes, historicalVolatility } from "@/lib/blackScholes";

// ── blackScholes ──────────────────────────────────────────────────────────────

describe("blackScholes — call pricing", () => {
  it("computes positive call price for ATM option", () => {
    const result = blackScholes({
      S: 100,
      K: 100,
      T: 0.25, // 3 months
      r: 0.05,
      sigma: 0.2,
      type: "call",
    });
    expect(result.price).toBeGreaterThan(0);
    // ATM 3-month call on $100 stock with 20% vol should be roughly $4-7
    expect(result.price).toBeGreaterThan(3);
    expect(result.price).toBeLessThan(10);
  });

  it("OTM call is cheaper than ATM call", () => {
    const base = { S: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "call" as const };
    const atm = blackScholes({ ...base, K: 100 });
    const otm = blackScholes({ ...base, K: 120 });
    expect(otm.price).toBeLessThan(atm.price);
  });

  it("ITM call is more expensive than ATM call", () => {
    const base = { S: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "call" as const };
    const atm = blackScholes({ ...base, K: 100 });
    const itm = blackScholes({ ...base, K: 80 });
    expect(itm.price).toBeGreaterThan(atm.price);
  });

  it("call delta is between 0 and 1", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.delta).toBeGreaterThan(0);
    expect(result.delta).toBeLessThan(1);
  });

  it("ATM call delta is near 0.5", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.5, r: 0.02, sigma: 0.2, type: "call",
    });
    expect(result.delta).toBeGreaterThan(0.45);
    expect(result.delta).toBeLessThan(0.60);
  });
});

describe("blackScholes — put pricing", () => {
  it("computes positive put price for ATM option", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "put",
    });
    expect(result.price).toBeGreaterThan(0);
  });

  it("ITM put (stock below strike) is more expensive than ATM put", () => {
    const base = { S: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "put" as const };
    const atm = blackScholes({ ...base, K: 100 });
    const itm = blackScholes({ ...base, K: 120 });
    expect(itm.price).toBeGreaterThan(atm.price);
  });

  it("put delta is between -1 and 0", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.2, type: "put",
    });
    expect(result.delta).toBeLessThan(0);
    expect(result.delta).toBeGreaterThan(-1);
  });

  it("put-call parity holds approximately", () => {
    const S = 100, K = 100, T = 0.5, r = 0.05, sigma = 0.2;
    const call = blackScholes({ S, K, T, r, sigma, type: "call" });
    const put = blackScholes({ S, K, T, r, sigma, type: "put" });
    // C - P = S - K * e^{-rT}
    const lhs = call.price - put.price;
    const rhs = S - K * Math.exp(-r * T);
    expect(lhs).toBeCloseTo(rhs, 2);
  });
});

describe("blackScholes — expiry behaviour (T=0)", () => {
  it("call at expiry: returns intrinsic value (S > K → ITM)", () => {
    const result = blackScholes({
      S: 110, K: 100, T: 0, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.price).toBeCloseTo(10, 5);
  });

  it("call at expiry: returns 0 when OTM (S < K)", () => {
    const result = blackScholes({
      S: 90, K: 100, T: 0, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.price).toBe(0);
  });

  it("put at expiry: returns intrinsic value (K > S → ITM)", () => {
    const result = blackScholes({
      S: 80, K: 100, T: -1, r: 0.05, sigma: 0.2, type: "put",
    });
    expect(result.price).toBeCloseTo(20, 5);
  });

  it("put at expiry: returns 0 when OTM (S > K)", () => {
    const result = blackScholes({
      S: 110, K: 100, T: 0, r: 0.05, sigma: 0.2, type: "put",
    });
    expect(result.price).toBe(0);
  });
});

describe("blackScholes — Greeks sanity checks", () => {
  it("gamma is non-negative", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.gamma).toBeGreaterThanOrEqual(0);
  });

  it("vega is non-negative", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.vega).toBeGreaterThanOrEqual(0);
  });

  it("theta is negative for a call (time decay)", () => {
    const result = blackScholes({
      S: 100, K: 100, T: 0.5, r: 0.05, sigma: 0.2, type: "call",
    });
    expect(result.theta).toBeLessThan(0);
  });

  it("higher volatility → higher option price", () => {
    const base = { S: 100, K: 100, T: 0.25, r: 0.05, type: "call" as const };
    const lowVol = blackScholes({ ...base, sigma: 0.1 });
    const highVol = blackScholes({ ...base, sigma: 0.4 });
    expect(highVol.price).toBeGreaterThan(lowVol.price);
  });

  it("longer time to expiry → higher option price", () => {
    const base = { S: 100, K: 100, r: 0.05, sigma: 0.2, type: "call" as const };
    const short = blackScholes({ ...base, T: 0.1 });
    const long = blackScholes({ ...base, T: 1.0 });
    expect(long.price).toBeGreaterThan(short.price);
  });
});

// ── historicalVolatility ──────────────────────────────────────────────────────

describe("historicalVolatility", () => {
  it("returns 0.2 default when fewer than 2 data points", () => {
    expect(historicalVolatility([])).toBe(0.2);
    expect(historicalVolatility([100])).toBe(0.2);
  });

  it("returns higher volatility for more volatile price series", () => {
    const steady = [100, 101, 102, 103, 104, 105];
    const volatile = [100, 120, 80, 130, 70, 140];
    const volSteady = historicalVolatility(steady);
    const volVolatile = historicalVolatility(volatile);
    expect(volVolatile).toBeGreaterThan(volSteady);
  });

  it("returns positive value for any price series with 2+ points", () => {
    const prices = [100, 105, 102, 108, 95];
    expect(historicalVolatility(prices)).toBeGreaterThan(0);
  });

  it("uses only the last 'window' data points (default 30)", () => {
    // Two different 2-point tails produce different volatility
    const longSeries1 = Array(50).fill(100).concat([100, 200]); // big move at the end
    const longSeries2 = Array(50).fill(100).concat([100, 101]); // small move at the end
    const v1 = historicalVolatility(longSeries1, 2);
    const v2 = historicalVolatility(longSeries2, 2);
    expect(v1).toBeGreaterThan(v2);
  });
});
