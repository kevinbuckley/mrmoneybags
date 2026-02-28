// Layer 1: lib — Black-Scholes options pricing
// See docs/design-docs/options-pricing.md for full spec

export interface BlackScholesInputs {
  S: number; // current underlying price
  K: number; // strike price
  T: number; // time to expiry in years
  r: number; // risk-free rate (annualized decimal)
  sigma: number; // volatility (annualized decimal)
  type: "call" | "put";
}

export interface BlackScholesResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per day
  vega: number;
  rho: number;
}

/** Abramowitz & Stegun normal CDF approximation (error < 7.5e-8) */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

/** Standard normal PDF */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Compute Black-Scholes option price and Greeks */
export function blackScholes(inputs: BlackScholesInputs): BlackScholesResult {
  const { S, K, T, r, sigma, type } = inputs;

  if (T <= 0) {
    // Expired — intrinsic value only
    const intrinsic =
      type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return { price: intrinsic, delta: intrinsic > 0 ? (type === "call" ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const ert = Math.exp(-r * T);

  let price: number;
  let delta: number;

  if (type === "call") {
    price = S * normalCDF(d1) - K * ert * normalCDF(d2);
    delta = normalCDF(d1);
  } else {
    price = K * ert * normalCDF(-d2) - S * normalCDF(-d1);
    delta = normalCDF(d1) - 1;
  }

  const gamma = normalPDF(d1) / (S * sigma * sqrtT);
  const vega = S * normalPDF(d1) * sqrtT;
  const theta =
    type === "call"
      ? -(S * normalPDF(d1) * sigma) / (2 * sqrtT) - r * K * ert * normalCDF(d2)
      : -(S * normalPDF(d1) * sigma) / (2 * sqrtT) + r * K * ert * normalCDF(-d2);
  const rho =
    type === "call"
      ? K * T * ert * normalCDF(d2)
      : -K * T * ert * normalCDF(-d2);

  return {
    price: Math.max(price, 0),
    delta,
    gamma,
    theta: theta / 365, // convert to per-day
    vega,
    rho,
  };
}

/** Compute annualized historical volatility from daily closes */
export function historicalVolatility(
  closes: number[],
  window: number = 30
): number {
  if (closes.length < 2) return 0.2; // default 20%
  const returns = closes
    .slice(1)
    .map((c, i) => Math.log(c / closes[i]));
  const recent = returns.slice(-window);
  if (recent.length < 2) return 0.2;
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance =
    recent.reduce((a, b) => a + (b - mean) ** 2, 0) / (recent.length - 1);
  return Math.sqrt(variance * 252);
}
