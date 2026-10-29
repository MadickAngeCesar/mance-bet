import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRawImpliedProbability,
  removeBookmakerMargin,
  calculateExpectedValue,
  evaluateValueQualification,
  calculateSimulatedStake,
} from './odds.ts';
import {
  calculateBrierScore,
  calculateLogLoss,
  computeCalibrationProfile,
  chronologicalTrainTestSplit,
} from './calibration.ts';
import {
  predictFootballMatch,
  predictTennisMatch,
  predictBasketballMatch,
  predictVolleyballMatch,
} from './sportsModels.ts';

test('Odds Engine: converts decimal odds, strips overround, and computes EV accurately', () => {
  const raw = calculateRawImpliedProbability(2.0);
  assert.equal(raw, 0.5);

  const marginRemoved = removeBookmakerMargin([1.91, 3.6, 4.2]);
  const sumFair = marginRemoved.fairProbabilities.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumFair - 1.0) < 0.002, 'Fair probabilities must sum to ~1.0');
  assert.ok(marginRemoved.overroundPct > 0, 'Overround percentage must be positive');

  // EV = (0.58 * 1.95) - 1 = +0.131 (+13.1%)
  const ev = calculateExpectedValue(0.58, 1.95);
  assert.equal(ev, 0.131);

  // Value qualification gate rejects stale or unverified odds
  const qualified = evaluateValueQualification({
    modelProbability: 0.58,
    decimalOdds: 1.95,
    modelReliability: 0.82,
    dataFreshnessMinutes: 15,
    isVerifiedOdds: true,
    minEvThreshold: 0.03,
  });
  assert.equal(qualified.isFlaggedValue, true);

  const disqualifiedStale = evaluateValueQualification({
    modelProbability: 0.58,
    decimalOdds: 1.95,
    modelReliability: 0.82,
    dataFreshnessMinutes: 300,
    isVerifiedOdds: true,
    minEvThreshold: 0.03,
  });
  assert.equal(disqualifiedStale.isFlaggedValue, false);
});

test('Staking Engine: calculates Flat, Fractional Kelly, and Percentage stakes properly', () => {
  const flatStake = calculateSimulatedStake({
    bankroll: 10000,
    strategy: 'flat',
    modelProbability: 0.55,
    decimalOdds: 2.0,
    flatUnit: 150,
  });
  assert.equal(flatStake, 150);

  const kellyStake = calculateSimulatedStake({
    bankroll: 10000,
    strategy: 'kelly_fractional',
    modelProbability: 0.6,
    decimalOdds: 2.0,
    kellyFraction: 0.25,
  });
  // Full Kelly on p=0.6, odds=2.0 is 0.20; 0.25 fractional Kelly = 0.05 * 10000 = 500
  assert.equal(kellyStake, 500);
});

test('Calibration & Validation Engine: Brier score, Log Loss, and leakage-free chronological split', () => {
  const samples = [
    { id: '1', matchTimestamp: '2026-08-10T18:00:00Z', predictedProbability: 0.8, actualOutcome: 1 as const },
    { id: '2', matchTimestamp: '2026-07-01T18:00:00Z', predictedProbability: 0.2, actualOutcome: 0 as const },
    { id: '3', matchTimestamp: '2026-09-15T18:00:00Z', predictedProbability: 0.7, actualOutcome: 1 as const },
    { id: '4', matchTimestamp: '2026-10-01T18:00:00Z', predictedProbability: 0.6, actualOutcome: 0 as const },
  ];

  const brier = calculateBrierScore(samples);
  assert.ok(brier > 0 && brier < 0.25);

  const logLoss = calculateLogLoss(samples);
  assert.ok(logLoss > 0 && logLoss < 0.7);

  const cal = computeCalibrationProfile(samples, 5);
  assert.equal(cal.bins.length, 5);

  const split = chronologicalTrainTestSplit(samples, 0.5);
  assert.equal(split.hasZeroLeakage, true);
  assert.equal(split.trainSet.length, 2);
  assert.equal(split.testSet.length, 2);
  assert.ok(
    new Date(split.trainSet[1].matchTimestamp).getTime() <=
      new Date(split.testSet[0].matchTimestamp).getTime()
  );
});

test('Sport Engines: Football, Tennis, Basketball, and Volleyball output valid normalized probabilities', () => {
  const football = predictFootballMatch({
    homeElo: 1910,
    awayElo: 1840,
    homeMetrics: {
      xgPer90: 2.05,
      xgaPer90: 0.88,
      goalsScoredPer90: 2.15,
      goalsConcededPer90: 0.82,
      shotsPer90: 15.8,
      shotsOnTargetPer90: 6.1,
      possessionPct: 61,
      bigChancesCreatedPer90: 3.4,
      cleanSheetPct: 45,
      cornersPer90: 6.8,
      cardsPer90: 1.6,
      homeAwaySplitWinPct: 74,
      firstHalfGoalSharePct: 46,
    },
    awayMetrics: {
      xgPer90: 1.65,
      xgaPer90: 1.12,
      goalsScoredPer90: 1.72,
      goalsConcededPer90: 1.08,
      shotsPer90: 13.4,
      shotsOnTargetPer90: 4.9,
      possessionPct: 54,
      bigChancesCreatedPer90: 2.5,
      cleanSheetPct: 34,
      cornersPer90: 5.5,
      cardsPer90: 1.9,
      homeAwaySplitWinPct: 56,
      firstHalfGoalSharePct: 43,
    },
  });

  assert.equal(
    Number((football.homeWinProb + football.drawProb + football.awayWinProb).toFixed(4)),
    1.0
  );
  assert.ok(football.homeWinProb > football.awayWinProb);

  const tennis = predictTennisMatch({
    playerAEloOverall: 2140,
    playerBEloOverall: 2050,
    playerASurfaceElo: 2190,
    playerBSurfaceElo: 2030,
    playerAMetrics: {
      firstServePct: 67,
      firstServePointsWonPct: 78,
      secondServePointsWonPct: 56,
      serviceGamesWonPct: 90,
      returnGamesWonPct: 28,
      breakPointsSavedPct: 69,
      breakPointsConvertedPct: 43,
      surfaceWinPct: 86,
      indoorOutdoorWinPct: 84,
      matchesLast7Days: 3,
      setsPlayedLast14Days: 7,
      tiebreakWinPct: 72,
    },
    playerBMetrics: {
      firstServePct: 64,
      firstServePointsWonPct: 74,
      secondServePointsWonPct: 52,
      serviceGamesWonPct: 85,
      returnGamesWonPct: 24,
      breakPointsSavedPct: 63,
      breakPointsConvertedPct: 39,
      surfaceWinPct: 76,
      indoorOutdoorWinPct: 75,
      matchesLast7Days: 4,
      setsPlayedLast14Days: 10,
      tiebreakWinPct: 61,
    },
    bestOfSets: 3,
  });
  assert.equal(Number((tennis.playerAWinProb + tennis.playerBWinProb).toFixed(4)), 1.0);
  assert.ok(tennis.playerAWinProb > 0.55);

  const basketball = predictBasketballMatch({
    homeElo: 1740,
    awayElo: 1660,
    homeMetrics: {
      offensiveRating: 118.4,
      defensiveRating: 110.2,
      netRating: 8.2,
      pace: 99.5,
      effectiveFgPct: 56.8,
      turnoverPct: 12.4,
      offensiveReboundPct: 29.5,
      freeThrowRate: 24.1,
      pointsPerGame: 117.8,
      opponentPointsPerGame: 109.6,
      firstQuarterNetRating: 3.1,
      homeAwayWinPct: 73,
    },
    awayMetrics: {
      offensiveRating: 114.2,
      defensiveRating: 113.1,
      netRating: 1.1,
      pace: 98.2,
      effectiveFgPct: 54.1,
      turnoverPct: 13.8,
      offensiveReboundPct: 26.8,
      freeThrowRate: 22.0,
      pointsPerGame: 112.5,
      opponentPointsPerGame: 111.4,
      firstQuarterNetRating: 0.4,
      homeAwayWinPct: 52,
    },
  });
  assert.equal(Number((basketball.homeWinProb + basketball.awayWinProb).toFixed(4)), 1.0);
  assert.ok(basketball.projectedTotalPoints > 200);

  const volleyball = predictVolleyballMatch({
    homeElo: 1850,
    awayElo: 1760,
    homeMetrics: {
      setWinPct: 74,
      attackEfficiencyPct: 53.5,
      positiveReceptionPct: 64.0,
      sideoutSuccessPct: 68.5,
      blocksPerSet: 2.7,
      acesPerSet: 1.8,
      serveErrorPct: 11.2,
      fifthSetWinPct: 66,
      pointsPerSetAvg: 23.1,
    },
    awayMetrics: {
      setWinPct: 62,
      attackEfficiencyPct: 49.0,
      positiveReceptionPct: 59.5,
      sideoutSuccessPct: 63.0,
      blocksPerSet: 2.2,
      acesPerSet: 1.4,
      serveErrorPct: 12.8,
      fifthSetWinPct: 52,
      pointsPerSetAvg: 21.8,
    },
  });
  assert.equal(Number((volleyball.homeWinProb + volleyball.awayWinProb).toFixed(4)), 1.0);
  const sumExactSets =
    volleyball.exactSetProbs.score3_0 +
    volleyball.exactSetProbs.score3_1 +
    volleyball.exactSetProbs.score3_2 +
    volleyball.exactSetProbs.score2_3 +
    volleyball.exactSetProbs.score1_3 +
    volleyball.exactSetProbs.score0_3;
  assert.ok(Math.abs(sumExactSets - 1.0) < 0.002);
});
