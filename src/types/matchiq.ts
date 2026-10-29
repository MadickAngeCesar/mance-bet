export type SportSlug = 'football' | 'tennis' | 'basketball' | 'volleyball';

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'postponed';

export type ConfidenceTier = 'high_calibrated' | 'moderate_calibrated' | 'low_sample_caution';

export type StakingStrategy = 'flat' | 'kelly_fractional' | 'percentage';

export interface Participant {
  id: string;
  name: string;
  shortCode: string;
  country: string;
  rankingOrSeed?: number;
  eloRating: number;
  surfaceElo?: {
    hard: number;
    clay: number;
    grass: number;
    indoor: number;
  };
  recentForm: ('W' | 'D' | 'L')[];
  restDays: number;
  injuriesOrAbsences: string[];
}

export interface FootballMetrics {
  xgPer90: number;
  xgaPer90: number;
  goalsScoredPer90: number;
  goalsConcededPer90: number;
  shotsPer90: number;
  shotsOnTargetPer90: number;
  possessionPct: number;
  bigChancesCreatedPer90: number;
  cleanSheetPct: number;
  cornersPer90: number;
  cardsPer90: number;
  homeAwaySplitWinPct: number;
  firstHalfGoalSharePct: number;
}

export interface TennisMetrics {
  firstServePct: number;
  firstServePointsWonPct: number;
  secondServePointsWonPct: number;
  serviceGamesWonPct: number;
  returnGamesWonPct: number;
  breakPointsSavedPct: number;
  breakPointsConvertedPct: number;
  surfaceWinPct: number;
  indoorOutdoorWinPct: number;
  matchesLast7Days: number;
  setsPlayedLast14Days: number;
  tiebreakWinPct: number;
}

export interface BasketballMetrics {
  offensiveRating: number;
  defensiveRating: number;
  netRating: number;
  pace: number;
  effectiveFgPct: number;
  turnoverPct: number;
  offensiveReboundPct: number;
  freeThrowRate: number;
  pointsPerGame: number;
  opponentPointsPerGame: number;
  firstQuarterNetRating: number;
  homeAwayWinPct: number;
}

export interface VolleyballMetrics {
  setWinPct: number;
  attackEfficiencyPct: number;
  positiveReceptionPct: number;
  sideoutSuccessPct: number;
  blocksPerSet: number;
  acesPerSet: number;
  serveErrorPct: number;
  fifthSetWinPct: number;
  pointsPerSetAvg: number;
}

export type SportSpecificStats =
  | { sport: 'football'; home: FootballMetrics; away: FootballMetrics }
  | { sport: 'tennis'; home: TennisMetrics; away: TennisMetrics }
  | { sport: 'basketball'; home: BasketballMetrics; away: BasketballMetrics }
  | { sport: 'volleyball'; home: VolleyballMetrics; away: VolleyballMetrics };

export interface HeadToHeadSummary {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  surfaceOrVenueBreakdown: string;
  lastMeetings: {
    date: string;
    competition: string;
    scoreLabel: string;
    winner: 'home' | 'away' | 'draw';
  }[];
}

export interface BookmakerMarketOutcome {
  selectionKey: string;
  selectionLabel: string;
  line?: number;
  bookmakerName: string;
  decimalOdds: number;
  rawImpliedProbability: number;
  fairMarketProbability: number;
  overroundPct: number;
  modelProbability: number;
  expectedValue: number;
  isValueFlagged: boolean;
  valueDisqualificationReason?: string;
  capturedAt: string;
}

export interface MarketPredictionGroup {
  marketKey: string;
  marketName: string;
  modelVersion: string;
  algorithmName: string;
  modelReliability: number;
  confidenceTier: ConfidenceTier;
  outcomes: BookmakerMarketOutcome[];
  recommendedSelectionKey?: string;
}

export interface AIContextualAnalysis {
  id: string;
  matchId: string;
  llmProvider: string;
  llmModel: string;
  recentFormAnalysis: string;
  strengthsAndWeaknesses: {
    homeStrengths: string[];
    homeWeaknesses: string[];
    awayStrengths: string[];
    awayWeaknesses: string[];
  };
  historicalPatterns: string;
  contextualFactors: string;
  uncertainties: string;
  invalidationFactors: string[];
  missingDataWarnings: string[];
  dataSnapshotTimestamp: string;
  generatedAt: string;
}

export interface MatchRecord {
  id: string;
  externalId: string;
  sport: SportSlug;
  competitionId: string;
  competitionName: string;
  competitionCategory: string;
  countryOrTour: string;
  season: string;
  venueName: string;
  surfaceOrEnvironment: string;
  isIndoor: boolean;
  scheduledAt: string;
  status: MatchStatus;
  homeParticipant: Participant;
  awayParticipant: Participant;
  homeScore?: number;
  awayScore?: number;
  periodScores?: string[];
  sportStats: SportSpecificStats;
  headToHead: HeadToHeadSummary;
  markets: MarketPredictionGroup[];
  aiAnalysis: AIContextualAnalysis;
  sourceProvenance: {
    providerName: string;
    adapterKey: string;
    lastSyncedAt: string;
    dataFreshnessMinutes: number;
    isVerifiedOdds: boolean;
  };
}

export interface TrackedPrediction {
  id: string;
  matchId: string;
  matchTitle: string;
  competitionName: string;
  sport: SportSlug;
  marketKey: string;
  marketName: string;
  predictedSelection: string;
  modelProbability: number;
  marketFairProbability: number;
  decimalOddsAtPrediction: number;
  expectedValue: number;
  modelVersion: string;
  modelReliability: number;
  dataTimestamp: string;
  predictionTimestamp: string;
  matchScheduledAt: string;
  status: 'pending' | 'won' | 'lost' | 'push';
  actualResultLabel?: string;
  brierScoreContribution?: number;
  logLossContribution?: number;
}

export interface CalibrationBin {
  binLabel: string;
  binMidpoint: number;
  predictedMean: number;
  observedFrequency: number;
  sampleCount: number;
}

export interface ModelEvaluationSummary {
  id: string;
  sport: SportSlug;
  modelVersion: string;
  algorithmFamily: string;
  description: string;
  isPrimaryActive: boolean;
  trainingPeriod: string;
  validationPeriod: string;
  validationMethod: 'Chronological Walk-Forward Split';
  sampleSize: number;
  accuracy: number;
  precision: number;
  recall: number;
  brierScore: number;
  logLoss: number;
  expectedCalibrationError: number;
  reliabilityScore: number;
  calibrationCurve: CalibrationBin[];
  marketBreakdown: {
    marketName: string;
    sampleSize: number;
    brierScore: number;
    logLoss: number;
    accuracy: number;
    simulatedRoiPct: number;
  }[];
}

export interface SimulatedBet {
  id: string;
  userId?: string;
  matchId: string;
  matchTitle: string;
  competitionName: string;
  sport: SportSlug;
  marketName: string;
  selectionLabel: string;
  stakingStrategy: StakingStrategy;
  stakeAmount: number;
  decimalOdds: number;
  closingDecimalOdds?: number;
  modelProbability: number;
  marketFairProbability: number;
  expectedValue: number;
  potentialPayout: number;
  status: 'open' | 'won' | 'lost' | 'push';
  profitLoss: number;
  placedAt: string;
  settledAt?: string;
}

export interface SimulatedBankrollState {
  id: string;
  name: string;
  initialCapital: number;
  currentBalance: number;
  peakBalance: number;
  totalStaked: number;
  netProfitLoss: number;
  roiPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  averageClvEdgePct: number;
  stakingStrategy: StakingStrategy;
  flatUnitAmount: number;
  kellyFraction: number;
  percentageRate: number;
  equityHistory: {
    date: string;
    label: string;
    balance: number;
    drawdownPct: number;
    cumulativeProfit: number;
  }[];
  bets: SimulatedBet[];
}

export interface DataProviderStatus {
  id: string;
  name: string;
  adapterKey: string;
  sportsSupported: SportSlug[];
  tierType: string;
  rateLimit: string;
  fixturesSupport: boolean;
  historicalStatsSupport: boolean;
  verifiedOddsSupport: boolean;
  status: 'connected' | 'fallback_seed_active' | 'rate_limited';
  lastSyncAt: string;
  notes: string;
}

export interface DataSyncLogEntry {
  id: string;
  providerName: string;
  sport: SportSlug | 'all';
  syncType: 'fixtures' | 'results' | 'odds' | 'csv_import' | 'predictions';
  recordsProcessed: number;
  recordsInserted: number;
  recordsSkippedDuplicate: number;
  status: 'success' | 'partial' | 'failed';
  message: string;
  timestamp: string;
}
