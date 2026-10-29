/**
 * MatchIQ — Multi-Sport Statistical Prediction Engine
 * Dedicated mathematical models for:
 *   A. Football (Dixon-Coles Bivariate Poisson + xG Elo Ensemble)
 *   B. Tennis (Surface-Blended Elo + Serve/Hold Markov & Logistic Model)
 *   C. Basketball (Pace-Adjusted Four Factors + Normal Margin/Total Distribution)
 *   D. Volleyball (Set-Level Combinatorial Markov + Sideout/Attack Efficiency Model)
 */

import {
  BasketballMetrics,
  FootballMetrics,
  TennisMetrics,
  VolleyballMetrics,
} from '../types/matchiq.ts';

function factorial(n: number): number {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Standard normal cumulative distribution function Phi(z) via Abramowitz & Stegun approximation
 */
export function normalCdf(x: number, mean = 0, stdDev = 1): number {
  if (stdDev <= 0) throw new Error('Standard deviation must be > 0');
  const z = (x - mean) / stdDev;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Elo win probability with optional home-advantage offset
 */
export function calculateEloWinProbability(
  ratingA: number,
  ratingB: number,
  homeAdvantagePoints = 0
): number {
  const diff = ratingA + homeAdvantagePoints - ratingB;
  return 1 / (1 + Math.pow(10, -diff / 400));
}

// ============================================================================
// A. FOOTBALL (SOCCER) STATISTICAL ENGINE — Dixon-Coles + xG Poisson
// ============================================================================

export interface FootballPredictionOutput {
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  doubleChance1XProb: number;
  doubleChanceX2Prob: number;
  doubleChance12Prob: number;
  drawNoBetHomeProb: number;
  drawNoBetAwayProb: number;
  over25GoalsProb: number;
  under25GoalsProb: number;
  bttsYesProb: number;
  bttsNoProb: number;
  asianHandicapHomeMinus15Prob: number;
  asianHandicapAwayPlus15Prob: number;
  firstHalfOver05Prob: number;
  firstHalfUnder05Prob: number;
  topCorrectScores: { score: string; probability: number }[];
}

/**
 * Dixon-Coles low-score dependence adjustment tau(x, y, lambda_x, lambda_y, rho)
 */
function dixonColesTau(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number
): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1.0;
}

export function predictFootballMatch(params: {
  homeElo: number;
  awayElo: number;
  homeMetrics: FootballMetrics;
  awayMetrics: FootballMetrics;
  homeRestDays?: number;
  awayRestDays?: number;
  rho?: number;
}): FootballPredictionOutput {
  const {
    homeElo,
    awayElo,
    homeMetrics,
    awayMetrics,
    homeRestDays = 6,
    awayRestDays = 6,
    rho = -0.11,
  } = params;

  // Blend xG/xGA with actual scoring rates and Elo rating differential
  const eloRatio = Math.pow(10, (homeElo + 55 - awayElo) / 800);
  const restAdjHome = homeRestDays < 4 ? 0.94 : 1.0;
  const restAdjAway = awayRestDays < 4 ? 0.94 : 1.0;

  const rawHomeAttack = 0.65 * homeMetrics.xgPer90 + 0.35 * homeMetrics.goalsScoredPer90;
  const rawAwayDefense = 0.65 * awayMetrics.xgaPer90 + 0.35 * awayMetrics.goalsConcededPer90;

  const rawAwayAttack = 0.65 * awayMetrics.xgPer90 + 0.35 * awayMetrics.goalsScoredPer90;
  const rawHomeDefense = 0.65 * homeMetrics.xgaPer90 + 0.35 * homeMetrics.goalsConcededPer90;

  const lambdaHome = Math.max(
    0.35,
    Math.min(3.8, ((rawHomeAttack + rawAwayDefense) / 2) * Math.sqrt(eloRatio) * 1.08 * restAdjHome)
  );
  const lambdaAway = Math.max(
    0.25,
    Math.min(3.4, ((rawAwayAttack + rawHomeDefense) / 2) / Math.sqrt(eloRatio) * 0.95 * restAdjAway)
  );

  const maxGoals = 7;
  const matrix: number[][] = [];
  let sumMatrix = 0;

  for (let h = 0; h <= maxGoals; h++) {
    matrix[h] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const baseProb = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      const tau = Math.max(0.1, dixonColesTau(h, a, lambdaHome, lambdaAway, rho));
      const p = baseProb * tau;
      matrix[h][a] = p;
      sumMatrix += p;
    }
  }

  // Normalize score grid strictly to 1.0
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  let over25GoalsProb = 0;
  let bttsYesProb = 0;
  let ahHomeMinus15Prob = 0;
  const scoreList: { score: string; probability: number }[] = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = matrix[h][a] / sumMatrix;
      matrix[h][a] = p;
      scoreList.push({ score: `${h}-${a}`, probability: Number(p.toFixed(4)) });

      if (h > a) homeWinProb += p;
      else if (h === a) drawProb += p;
      else awayWinProb += p;

      if (h + a >= 3) over25GoalsProb += p;
      if (h >= 1 && a >= 1) bttsYesProb += p;
      if (h - a >= 2) ahHomeMinus15Prob += p;
    }
  }

  scoreList.sort((a, b) => b.probability - a.probability);

  const nonDrawSum = Math.max(1e-6, homeWinProb + awayWinProb);
  const firstHalfLambda = (lambdaHome + lambdaAway) * 0.44;
  const firstHalfUnder05Prob = Math.exp(-firstHalfLambda);
  const firstHalfOver05Prob = 1 - firstHalfUnder05Prob;

  return {
    expectedHomeGoals: Number(lambdaHome.toFixed(2)),
    expectedAwayGoals: Number(lambdaAway.toFixed(2)),
    homeWinProb: Number(homeWinProb.toFixed(4)),
    drawProb: Number(drawProb.toFixed(4)),
    awayWinProb: Number((1 - Number(homeWinProb.toFixed(4)) - Number(drawProb.toFixed(4))).toFixed(4)),
    doubleChance1XProb: Number((homeWinProb + drawProb).toFixed(4)),
    doubleChanceX2Prob: Number((awayWinProb + drawProb).toFixed(4)),
    doubleChance12Prob: Number((homeWinProb + awayWinProb).toFixed(4)),
    drawNoBetHomeProb: Number((homeWinProb / nonDrawSum).toFixed(4)),
    drawNoBetAwayProb: Number((awayWinProb / nonDrawSum).toFixed(4)),
    over25GoalsProb: Number(over25GoalsProb.toFixed(4)),
    under25GoalsProb: Number((1 - over25GoalsProb).toFixed(4)),
    bttsYesProb: Number(bttsYesProb.toFixed(4)),
    bttsNoProb: Number((1 - bttsYesProb).toFixed(4)),
    asianHandicapHomeMinus15Prob: Number(ahHomeMinus15Prob.toFixed(4)),
    asianHandicapAwayPlus15Prob: Number((1 - ahHomeMinus15Prob).toFixed(4)),
    firstHalfOver05Prob: Number(firstHalfOver05Prob.toFixed(4)),
    firstHalfUnder05Prob: Number(firstHalfUnder05Prob.toFixed(4)),
    topCorrectScores: scoreList.slice(0, 5),
  };
}

// ============================================================================
// B. TENNIS STATISTICAL ENGINE — Surface-Adjusted Elo + Serve/Return Logistic
// ============================================================================

export interface TennisPredictionOutput {
  playerAWinProb: number;
  playerBWinProb: number;
  singleSetWinProbA: number;
  straightSetsWinProbA: number;
  straightSetsWinProbB: number;
  playerAWinsAtLeastOneSetProb: number;
  playerBWinsAtLeastOneSetProb: number;
  expectedTotalGames: number;
  overGamesLineProb: number;
  underGamesLineProb: number;
  gamesHandicapCoverProbA: number;
}

export function predictTennisMatch(params: {
  playerAEloOverall: number;
  playerBEloOverall: number;
  playerASurfaceElo: number;
  playerBSurfaceElo: number;
  playerAMetrics: TennisMetrics;
  playerBMetrics: TennisMetrics;
  bestOfSets?: 3 | 5;
  totalGamesLine?: number;
  handicapGamesLineA?: number;
}): TennisPredictionOutput {
  const {
    playerAEloOverall,
    playerBEloOverall,
    playerASurfaceElo,
    playerBSurfaceElo,
    playerAMetrics,
    playerBMetrics,
    bestOfSets = 3,
    totalGamesLine = 22.5,
    handicapGamesLineA = -3.5,
  } = params;

  // 55% surface-specific Elo + 45% overall Elo
  const blendedEloA = 0.55 * playerASurfaceElo + 0.45 * playerAEloOverall;
  const blendedEloB = 0.55 * playerBSurfaceElo + 0.45 * playerBEloOverall;
  const eloProbA = calculateEloWinProbability(blendedEloA, blendedEloB, 0);

  // Serve/Return & Break Point dominance feature
  const serveEdgeA =
    (playerAMetrics.serviceGamesWonPct - playerBMetrics.serviceGamesWonPct) * 0.008 +
    (playerAMetrics.returnGamesWonPct - playerBMetrics.returnGamesWonPct) * 0.009 +
    (playerAMetrics.breakPointsConvertedPct - playerBMetrics.breakPointsConvertedPct) * 0.003;

  // Workload / fatigue penalty if player played > 10 sets in last 14 days
  const fatigueDiff =
    Math.max(0, playerBMetrics.setsPlayedLast14Days - 8) * 0.006 -
    Math.max(0, playerAMetrics.setsPlayedLast14Days - 8) * 0.006;

  // Logistic synthesis for single-set win probability p_set
  const logitElo = Math.log(eloProbA / (1 - eloProbA));
  const setLogit = 0.72 * logitElo + serveEdgeA + fatigueDiff;
  const pSet = Math.min(0.88, Math.max(0.12, 1 / (1 + Math.exp(-setLogit))));
  const qSet = 1 - pSet;

  let matchWinProbA: number;
  let straightSetsA: number;
  let straightSetsB: number;
  let aWinsAtLeastOneSet: number;
  let bWinsAtLeastOneSet: number;
  let expectedSets: number;

  if (bestOfSets === 3) {
    // Best-of-3: Win 2-0 (p^2) or 2-1 (2 * p^2 * q)
    straightSetsA = pSet * pSet;
    const twoOneA = 2 * pSet * pSet * qSet;
    matchWinProbA = straightSetsA + twoOneA;
    straightSetsB = qSet * qSet;
    aWinsAtLeastOneSet = 1 - straightSetsB;
    bWinsAtLeastOneSet = 1 - straightSetsA;
    const prob3Sets = 2 * pSet * qSet;
    expectedSets = 2 * (1 - prob3Sets) + 3 * prob3Sets;
  } else {
    // Best-of-5: Win 3-0 (p^3), 3-1 (3 * p^3 * q), 3-2 (6 * p^3 * q^2)
    straightSetsA = Math.pow(pSet, 3);
    const threeOneA = 3 * Math.pow(pSet, 3) * qSet;
    const threeTwoA = 6 * Math.pow(pSet, 3) * Math.pow(qSet, 2);
    matchWinProbA = straightSetsA + threeOneA + threeTwoA;
    straightSetsB = Math.pow(qSet, 3);
    aWinsAtLeastOneSet = 1 - straightSetsB;
    bWinsAtLeastOneSet = 1 - straightSetsA;
    const prob3 = straightSetsA + straightSetsB;
    const prob4 = 3 * pSet * qSet * (pSet * pSet + qSet * qSet);
    const prob5 = 6 * pSet * pSet * qSet * qSet;
    expectedSets = 3 * prob3 + 4 * prob4 + 5 * prob5;
  }

  // Expected games per set increases with average service hold %
  const avgHoldPct = (playerAMetrics.serviceGamesWonPct + playerBMetrics.serviceGamesWonPct) / 2;
  const gamesPerSet = 9.1 + Math.max(0, (avgHoldPct - 70) * 0.048);
  const expectedTotalGames = Number((expectedSets * gamesPerSet).toFixed(1));

  const overGamesProb = 1 - normalCdf(totalGamesLine, expectedTotalGames, bestOfSets === 3 ? 3.8 : 5.4);
  const expectedGameMarginA = (pSet - 0.5) * expectedSets * 4.8;
  const gamesHandicapCoverProbA =
    1 - normalCdf(-handicapGamesLineA, expectedGameMarginA, bestOfSets === 3 ? 3.4 : 4.8);

  return {
    playerAWinProb: Number(matchWinProbA.toFixed(4)),
    playerBWinProb: Number((1 - matchWinProbA).toFixed(4)),
    singleSetWinProbA: Number(pSet.toFixed(4)),
    straightSetsWinProbA: Number(straightSetsA.toFixed(4)),
    straightSetsWinProbB: Number(straightSetsB.toFixed(4)),
    playerAWinsAtLeastOneSetProb: Number(aWinsAtLeastOneSet.toFixed(4)),
    playerBWinsAtLeastOneSetProb: Number(bWinsAtLeastOneSet.toFixed(4)),
    expectedTotalGames,
    overGamesLineProb: Number(overGamesProb.toFixed(4)),
    underGamesLineProb: Number((1 - overGamesProb).toFixed(4)),
    gamesHandicapCoverProbA: Number(gamesHandicapCoverProbA.toFixed(4)),
  };
}

// ============================================================================
// C. BASKETBALL STATISTICAL ENGINE — Pace + Off/Def Ratings + Four Factors
// ============================================================================

export interface BasketballPredictionOutput {
  projectedHomePoints: number;
  projectedAwayPoints: number;
  projectedTotalPoints: number;
  projectedMarginHome: number;
  homeWinProb: number;
  awayWinProb: number;
  homeSpreadCoverProb: number;
  awaySpreadCoverProb: number;
  overTotalProb: number;
  underTotalProb: number;
  firstQuarterHomeWinProb: number;
}

export function predictBasketballMatch(params: {
  homeElo: number;
  awayElo: number;
  homeMetrics: BasketballMetrics;
  awayMetrics: BasketballMetrics;
  spreadLineHome?: number; // e.g., -5.5 means Home must win by >= 6
  totalPointsLine?: number;
  homeRestDays?: number;
  awayRestDays?: number;
}): BasketballPredictionOutput {
  const {
    homeElo,
    awayElo,
    homeMetrics,
    awayMetrics,
    spreadLineHome = -4.5,
    totalPointsLine = 221.5,
    homeRestDays = 2,
    awayRestDays = 2,
  } = params;

  const projectedPace = (homeMetrics.pace + awayMetrics.pace) / 2;
  const leagueBaselinePpp = 113.5;

  // Four Factors efficiency adjustment
  const fourFactorsEdgeHome =
    (homeMetrics.effectiveFgPct - awayMetrics.effectiveFgPct) * 0.35 -
    (homeMetrics.turnoverPct - awayMetrics.turnoverPct) * 0.25 +
    (homeMetrics.offensiveReboundPct - awayMetrics.offensiveReboundPct) * 0.15;

  const homeCourtPoints = 2.8;
  const restEdgeHome = (Math.min(3, homeRestDays) - Math.min(3, awayRestDays)) * 0.9;
  const eloMargin = (homeElo - awayElo) / 28;

  const expectedHomeOrtg =
    (homeMetrics.offensiveRating + awayMetrics.defensiveRating) / 2 +
    fourFactorsEdgeHome * 0.5;
  const expectedAwayOrtg =
    (awayMetrics.offensiveRating + homeMetrics.defensiveRating) / 2 -
    fourFactorsEdgeHome * 0.5;

  const rawHomePts = (expectedHomeOrtg / 100) * projectedPace + homeCourtPoints * 0.5 + restEdgeHome * 0.5;
  const rawAwayPts = (expectedAwayOrtg / 100) * projectedPace - homeCourtPoints * 0.5 - restEdgeHome * 0.5;

  // Blend rating-based projection with Elo margin
  const ratingsMargin = rawHomePts - rawAwayPts;
  const projectedMarginHome = Number((0.65 * ratingsMargin + 0.35 * eloMargin).toFixed(1));
  const projectedTotalPoints = Number(
    Math.max(145, Math.min(255, rawHomePts + rawAwayPts + (projectedPace - 98) * 0.2 + (leagueBaselinePpp - 113.5))).toFixed(1)
  );

  const projectedHomePoints = Number(((projectedTotalPoints + projectedMarginHome) / 2).toFixed(1));
  const projectedAwayPoints = Number(((projectedTotalPoints - projectedMarginHome) / 2).toFixed(1));

  const marginStdDev = 11.5;
  const totalStdDev = 13.8;

  const homeWinProb = 1 - normalCdf(0, projectedMarginHome, marginStdDev);
  // If spreadLineHome is -5.5, Home covers when Margin > 5.5
  const requiredMargin = -spreadLineHome;
  const homeSpreadCoverProb = 1 - normalCdf(requiredMargin, projectedMarginHome, marginStdDev);
  const overTotalProb = 1 - normalCdf(totalPointsLine, projectedTotalPoints, totalStdDev);

  const q1Margin =
    projectedMarginHome * 0.26 +
    (homeMetrics.firstQuarterNetRating - awayMetrics.firstQuarterNetRating) * 0.18;
  const firstQuarterHomeWinProb = 1 - normalCdf(0, q1Margin, 6.2);

  return {
    projectedHomePoints,
    projectedAwayPoints,
    projectedTotalPoints,
    projectedMarginHome,
    homeWinProb: Number(homeWinProb.toFixed(4)),
    awayWinProb: Number((1 - homeWinProb).toFixed(4)),
    homeSpreadCoverProb: Number(homeSpreadCoverProb.toFixed(4)),
    awaySpreadCoverProb: Number((1 - homeSpreadCoverProb).toFixed(4)),
    overTotalProb: Number(overTotalProb.toFixed(4)),
    underTotalProb: Number((1 - overTotalProb).toFixed(4)),
    firstQuarterHomeWinProb: Number(firstQuarterHomeWinProb.toFixed(4)),
  };
}

// ============================================================================
// D. VOLLEYBALL STATISTICAL ENGINE — Set-Level Markov + Sideout Efficiency
// ============================================================================

export interface VolleyballPredictionOutput {
  singleSetWinProbHome: number;
  homeWinProb: number;
  awayWinProb: number;
  homeMinus15SetsProb: number;
  awayPlus15SetsProb: number;
  over35SetsProb: number;
  under35SetsProb: number;
  over45SetsProb: number;
  expectedTotalPoints: number;
  overPointsLineProb: number;
  underPointsLineProb: number;
  exactSetProbs: {
    score3_0: number;
    score3_1: number;
    score3_2: number;
    score2_3: number;
    score1_3: number;
    score0_3: number;
  };
}

export function predictVolleyballMatch(params: {
  homeElo: number;
  awayElo: number;
  homeMetrics: VolleyballMetrics;
  awayMetrics: VolleyballMetrics;
  totalPointsLine?: number;
}): VolleyballPredictionOutput {
  const {
    homeElo,
    awayElo,
    homeMetrics,
    awayMetrics,
    totalPointsLine = 181.5,
  } = params;

  const eloSetProb = calculateEloWinProbability(homeElo, awayElo, 35);
  const efficiencyEdge =
    (homeMetrics.attackEfficiencyPct - awayMetrics.attackEfficiencyPct) * 0.009 +
    (homeMetrics.sideoutSuccessPct - awayMetrics.sideoutSuccessPct) * 0.008 +
    (homeMetrics.blocksPerSet - awayMetrics.blocksPerSet) * 0.025;

  const pSet = Math.min(0.86, Math.max(0.14, eloSetProb * 0.65 + (0.5 + efficiencyEdge) * 0.35));
  const qSet = 1 - pSet;

  // 5th set (to 15 points) has slightly higher variance (closer to 0.50)
  const pSet5 = 0.5 + (pSet - 0.5) * 0.82;
  const qSet5 = 1 - pSet5;

  // Combinatorial Best-of-5 exact set score probabilities
  const score3_0 = Math.pow(pSet, 3);
  const score3_1 = 3 * Math.pow(pSet, 3) * qSet;
  const score3_2 = 6 * Math.pow(pSet, 2) * Math.pow(qSet, 2) * pSet5;

  const score0_3 = Math.pow(qSet, 3);
  const score1_3 = 3 * Math.pow(qSet, 3) * pSet;
  const score2_3 = 6 * Math.pow(pSet, 2) * Math.pow(qSet, 2) * qSet5;

  const homeWinProb = score3_0 + score3_1 + score3_2;
  const homeMinus15SetsProb = score3_0 + score3_1;
  const prob3Sets = score3_0 + score0_3;
  const prob4Sets = score3_1 + score1_3;
  const prob5Sets = score3_2 + score2_3;

  const over35SetsProb = prob4Sets + prob5Sets;
  const avgPtsRegularSet = (homeMetrics.pointsPerSetAvg + awayMetrics.pointsPerSetAvg) || 45.2;
  const expectedTotalPoints = Number(
    (
      prob3Sets * (3 * avgPtsRegularSet) +
      prob4Sets * (4 * avgPtsRegularSet) +
      prob5Sets * (4 * avgPtsRegularSet + 26.5)
    ).toFixed(1)
  );

  const overPointsLineProb = 1 - normalCdf(totalPointsLine, expectedTotalPoints, 14.5);

  return {
    singleSetWinProbHome: Number(pSet.toFixed(4)),
    homeWinProb: Number(homeWinProb.toFixed(4)),
    awayWinProb: Number((1 - homeWinProb).toFixed(4)),
    homeMinus15SetsProb: Number(homeMinus15SetsProb.toFixed(4)),
    awayPlus15SetsProb: Number((1 - homeMinus15SetsProb).toFixed(4)),
    over35SetsProb: Number(over35SetsProb.toFixed(4)),
    under35SetsProb: Number(prob3Sets.toFixed(4)),
    over45SetsProb: Number(prob5Sets.toFixed(4)),
    expectedTotalPoints,
    overPointsLineProb: Number(overPointsLineProb.toFixed(4)),
    underPointsLineProb: Number((1 - overPointsLineProb).toFixed(4)),
    exactSetProbs: {
      score3_0: Number(score3_0.toFixed(4)),
      score3_1: Number(score3_1.toFixed(4)),
      score3_2: Number(score3_2.toFixed(4)),
      score2_3: Number(score2_3.toFixed(4)),
      score1_3: Number(score1_3.toFixed(4)),
      score0_3: Number(score0_3.toFixed(4)),
    },
  };
}
