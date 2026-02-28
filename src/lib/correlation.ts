// Layer 1: lib — correlation math for dispersion trades
// See docs/design-docs/dispersion-trades.md

import type { PriceSeries } from "@/types/instrument";

/** Compute daily log returns from a price series */
export function dailyLogReturns(series: PriceSeries): number[] {
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].close;
    const curr = series[i].close;
    if (prev > 0) returns.push(Math.log(curr / prev));
  }
  return returns;
}

/** Pearson correlation coefficient between two return series */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return cov / denom;
}

/**
 * Average pairwise Pearson correlation across a set of return series.
 * Used to compute benchmark and realized correlation for dispersion trades.
 */
export function averagePairwiseCorrelation(returnSeries: number[][]): number {
  if (returnSeries.length < 2) return 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < returnSeries.length; i++) {
    for (let j = i + 1; j < returnSeries.length; j++) {
      total += pearsonCorrelation(returnSeries[i], returnSeries[j]);
      count++;
    }
  }
  return count === 0 ? 0 : total / count;
}
