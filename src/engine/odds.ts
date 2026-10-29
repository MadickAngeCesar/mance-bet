/**
 * MatchIQ — Bookmaker Odds, Margin Removal, Expected Value & Staking Mathematics
 */

import { StakingStrategy } from '../types/matchiq.ts';

/**
 * Converts decimal odds to raw implied probability: P_raw = 1 / Decimal Odds
 */
export function calculateRawImpliedProbability(decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1.0) {
    throw new Error(`Invalid decimal odds: ${decimalOdds}. Decimal odds must be > 1.0.`);
  }
  return 1 / decimalOdds;
}

/**
 * Calculates total bookmaker overround (vig / margin) as a decimal fraction (e.g. 0.048 = 4.8%)
 */
export function calculateBookmakerOverround(decimalOddsList: number[]): number {
  if (!decimalOddsList.length) {
    throw new Error('Cannot calculate overround on empty odds list.');
  }
  const sumRawImplied = decimalOddsList.reduce(
    (sum, odds) => sum + calculateRawImpliedProbability(odds),
    0
  );
  return Math.max(0, sumRawImplied - 1);
}

/**
 * Removes bookmaker margin (overround) across mutually exclusive market outcomes
 * so the returned fair market probabilities sum strictly to 1.0.
 */
export function removeBookmakerMargin(decimalOddsList: number[]): {
  rawProbabilities: number[];
  fairProbabilities: number[];
  overroundPct: number;
} {
  if (decimalOddsList.length < 2) {
    throw new Error('Market normalization requires at least 2 mutually exclusive outcomes.');
  }

  const rawProbabilities = decimalOddsList.map(calculateRawImpliedProbability);
  const totalImplied = rawProbabilities.reduce((a, b) => a + b, 0);
  const overroundPct = Math.max(0, (totalImplied - 1) * 100);

  const fairProbabilities = rawProbabilities.map((raw) => raw / totalImplied);

  return {
    rawProbabilities: rawProbabilities.map((p) => Number(p.toFixed(4))),
    fairProbabilities: fairProbabilities.map((p) => Number(p.toFixed(4))),
    overroundPct: Number(overroundPct.toFixed(2)),
  };
}

/**
 * Calculates Expected Value (EV): EV = (Model Probability * Decimal Odds) - 1
 */
export function calculateExpectedValue(modelProbability: number, decimalOdds: number): number {
  if (!Number.isFinite(modelProbability) || modelProbability <= 0 || modelProbability >= 1) {
    throw new Error(`Model probability must be strictly between 0 and 1, got ${modelProbability}`);
  }
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1.0) {
    throw new Error(`Decimal odds must be > 1.0, got ${decimalOdds}`);
  }
  return Number((modelProbability * decimalOdds - 1).toFixed(4));
}

export interface ValueQualificationCheck {
  modelProbability: number;
  decimalOdds: number;
  modelReliability: number;
  dataFreshnessMinutes: number;
  isVerifiedOdds: boolean;
  minEvThreshold?: number;
  minModelProbability?: number;
  minReliabilityThreshold?: number;
  maxFreshnessMinutes?: number;
}

export interface ValueQualificationResult {
  expectedValue: number;
  isFlaggedValue: boolean;
  disqualificationReasons: string[];
}

/**
 * Evaluates whether a selection qualifies as a verifiable +EV candidate under strict guardrails:
 * 1. Underlying odds are verified (not fabricated or missing)
 * 2. Data is fresh (within maxFreshnessMinutes, default 180 min)
 * 3. Model reliability meets calibration threshold (default >= 0.72)
 * 4. Model probability meets floor (default >= 0.15)
 * 5. Expected value exceeds configurable threshold (default >= 0.025 / +2.5%)
 */
export function evaluateValueQualification(input: ValueQualificationCheck): ValueQualificationResult {
  const {
    modelProbability,
    decimalOdds,
    modelReliability,
    dataFreshnessMinutes,
    isVerifiedOdds,
    minEvThreshold = 0.025,
    minModelProbability = 0.15,
    minReliabilityThreshold = 0.72,
    maxFreshnessMinutes = 180,
  } = input;

  const expectedValue = calculateExpectedValue(modelProbability, decimalOdds);
  const reasons: string[] = [];

  if (!isVerifiedOdds) {
    reasons.push('Unverified bookmaker odds source');
  }
  if (dataFreshnessMinutes > maxFreshnessMinutes) {
    reasons.push(`Odds data is stale (${dataFreshnessMinutes}m > ${maxFreshnessMinutes}m limit)`);
  }
  if (modelReliability < minReliabilityThreshold) {
    reasons.push(
      `Model calibration reliability (${(modelReliability * 100).toFixed(0)}%) below ${(minReliabilityThreshold * 100).toFixed(0)}% threshold`
    );
  }
  if (modelProbability < minModelProbability) {
    reasons.push(
      `Model probability (${(modelProbability * 100).toFixed(1)}%) below minimum floor (${(minModelProbability * 100).toFixed(1)}%)`
    );
  }
  if (expectedValue < minEvThreshold) {
    reasons.push(
      `Expected value (${(expectedValue * 100).toFixed(2)}%) below +${(minEvThreshold * 100).toFixed(1)}% threshold`
    );
  }

  return {
    expectedValue,
    isFlaggedValue: reasons.length === 0,
    disqualificationReasons: reasons,
  };
}

/**
 * Computes recommended hypothetical stake for paper-betting simulations.
 */
export function calculateSimulatedStake(params: {
  bankroll: number;
  strategy: StakingStrategy;
  modelProbability: number;
  decimalOdds: number;
  flatUnit?: number;
  kellyFraction?: number;
  percentageRate?: number;
}): number {
  const {
    bankroll,
    strategy,
    modelProbability,
    decimalOdds,
    flatUnit = 100,
    kellyFraction = 0.25,
    percentageRate = 0.02,
  } = params;

  if (bankroll <= 0) return 0;

  if (strategy === 'flat') {
    return Number(Math.min(bankroll, Math.max(10, flatUnit)).toFixed(2));
  }

  if (strategy === 'percentage') {
    const rawStake = bankroll * Math.max(0.005, Math.min(0.1, percentageRate));
    return Number(Math.min(bankroll, Math.max(10, rawStake)).toFixed(2));
  }

  // Fractional Kelly Criterion: f* = ((b * p - q) / b) * kellyFraction, where b = decimalOdds - 1, q = 1 - p
  const b = decimalOdds - 1;
  const p = modelProbability;
  const q = 1 - p;
  const fullKelly = (b * p - q) / b;

  if (fullKelly <= 0) {
    // If EV <= 0, Kelly recommends 0; for manual user override simulation, cap at 0.5% min research unit
    return Number(Math.min(bankroll, Math.max(10, bankroll * 0.005)).toFixed(2));
  }

  const cappedFraction = Math.min(0.08, fullKelly * kellyFraction);
  return Number(Math.min(bankroll, Math.max(10, bankroll * cappedFraction)).toFixed(2));
}
