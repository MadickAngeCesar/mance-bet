/**
 * MatchIQ — Statistical Model Evaluation, Brier Score, Log Loss, Calibration & Chronological Split Engine
 */

import { CalibrationBin } from '../types/matchiq.ts';

export interface PredictionEvaluationSample {
  id: string;
  matchTimestamp: string; // ISO-8601
  predictedProbability: number; // 0 < p < 1
  actualOutcome: 0 | 1; // 1 if predicted event occurred, 0 otherwise
}

/**
 * Calculates Brier Score: BS = (1 / N) * sum((p_i - y_i)^2)
 * Lower is better (0.00 = perfect, 0.25 = uninformative 50/50 coin flip).
 */
export function calculateBrierScore(samples: Pick<PredictionEvaluationSample, 'predictedProbability' | 'actualOutcome'>[]): number {
  if (!samples.length) {
    throw new Error('Cannot calculate Brier score on empty sample set.');
  }
  const sumSqError = samples.reduce((acc, s) => {
    const diff = s.predictedProbability - s.actualOutcome;
    return acc + diff * diff;
  }, 0);
  return Number((sumSqError / samples.length).toFixed(4));
}

/**
 * Calculates Binary Log Loss (Cross-Entropy):
 * LL = -(1 / N) * sum(y_i * ln(p_i) + (1 - y_i) * ln(1 - p_i))
 */
export function calculateLogLoss(samples: Pick<PredictionEvaluationSample, 'predictedProbability' | 'actualOutcome'>[]): number {
  if (!samples.length) {
    throw new Error('Cannot calculate Log Loss on empty sample set.');
  }
  const eps = 1e-12;
  const sumLoss = samples.reduce((acc, s) => {
    const p = Math.min(1 - eps, Math.max(eps, s.predictedProbability));
    const y = s.actualOutcome;
    return acc - (y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }, 0);
  return Number((sumLoss / samples.length).toFixed(4));
}

/**
 * Computes classification Accuracy, Precision, and Recall at a threshold (default 0.5).
 */
export function calculateClassificationMetrics(
  samples: Pick<PredictionEvaluationSample, 'predictedProbability' | 'actualOutcome'>[],
  threshold = 0.5
): { accuracy: number; precision: number; recall: number } {
  if (!samples.length) {
    return { accuracy: 0, precision: 0, recall: 0 };
  }

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const s of samples) {
    const pred = s.predictedProbability >= threshold ? 1 : 0;
    if (pred === 1 && s.actualOutcome === 1) tp++;
    else if (pred === 1 && s.actualOutcome === 0) fp++;
    else if (pred === 0 && s.actualOutcome === 0) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / samples.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
  };
}

/**
 * Generates calibration reliability bins and Expected Calibration Error (ECE).
 */
export function computeCalibrationProfile(
  samples: Pick<PredictionEvaluationSample, 'predictedProbability' | 'actualOutcome'>[],
  numBins = 5
): { bins: CalibrationBin[]; expectedCalibrationError: number } {
  if (!samples.length) {
    return { bins: [], expectedCalibrationError: 0 };
  }

  const bins: CalibrationBin[] = [];
  let ece = 0;

  for (let i = 0; i < numBins; i++) {
    const lower = i / numBins;
    const upper = (i + 1) / numBins;
    const inBin = samples.filter((s) =>
      i === numBins - 1
        ? s.predictedProbability >= lower && s.predictedProbability <= upper
        : s.predictedProbability >= lower && s.predictedProbability < upper
    );

    const midpoint = Number(((lower + upper) / 2).toFixed(2));
    const binLabel = `${Math.round(lower * 100)}–${Math.round(upper * 100)}%`;

    if (inBin.length === 0) {
      bins.push({
        binLabel,
        binMidpoint: midpoint,
        predictedMean: midpoint,
        observedFrequency: midpoint,
        sampleCount: 0,
      });
      continue;
    }

    const predictedMean = inBin.reduce((a, b) => a + b.predictedProbability, 0) / inBin.length;
    const observedFrequency = inBin.reduce((a, b) => a + b.actualOutcome, 0) / inBin.length;

    ece += (inBin.length / samples.length) * Math.abs(predictedMean - observedFrequency);

    bins.push({
      binLabel,
      binMidpoint: midpoint,
      predictedMean: Number(predictedMean.toFixed(4)),
      observedFrequency: Number(observedFrequency.toFixed(4)),
      sampleCount: inBin.length,
    });
  }

  return {
    bins,
    expectedCalibrationError: Number(ece.toFixed(4)),
  };
}

/**
 * Performs a strict chronological train/test split to prevent future-data leakage.
 * Guarantees that every training sample timestamp is <= every test sample timestamp.
 */
export function chronologicalTrainTestSplit<T extends { matchTimestamp: string }>(
  records: T[],
  trainFraction = 0.75
): {
  trainSet: T[];
  testSet: T[];
  cutoffTimestamp: string;
  hasZeroLeakage: boolean;
} {
  if (records.length < 2) {
    throw new Error('Chronological split requires at least 2 historical records.');
  }
  if (trainFraction <= 0 || trainFraction >= 1) {
    throw new Error('trainFraction must be between 0 and 1.');
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.matchTimestamp).getTime() - new Date(b.matchTimestamp).getTime()
  );

  const splitIndex = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * trainFraction)));
  const trainSet = sorted.slice(0, splitIndex);
  const testSet = sorted.slice(splitIndex);

  const maxTrainTime = new Date(trainSet[trainSet.length - 1].matchTimestamp).getTime();
  const minTestTime = new Date(testSet[0].matchTimestamp).getTime();

  return {
    trainSet,
    testSet,
    cutoffTimestamp: trainSet[trainSet.length - 1].matchTimestamp,
    hasZeroLeakage: maxTrainTime <= minTestTime,
  };
}
