import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2, ShieldCheck, Activity, Lock } from 'lucide-react';
import {
  ModelEvaluationSummary,
  SportSlug,
  TrackedPrediction,
} from '../types/matchiq.ts';

interface PerformanceAnalyticsViewProps {
  modelEvaluations: ModelEvaluationSummary[];
  trackedPredictions: TrackedPrediction[];
  onInspectMatch: (matchId: string) => void;
}

export const PerformanceAnalyticsView: React.FC<PerformanceAnalyticsViewProps> = ({
  modelEvaluations,
  trackedPredictions,
  onInspectMatch,
}) => {
  const [selectedSport, setSelectedSport] = useState<SportSlug>('football');
  const [selectedEvalId, setSelectedEvalId] = useState<string>(
    modelEvaluations[0]?.id || ''
  );
  const [predictionSportFilter, setPredictionSportFilter] = useState<SportSlug | 'all'>('all');
  const [validationCheckResult, setValidationCheckResult] = useState<{
    cutoffTimestamp: string;
    hasZeroLeakage: boolean;
    holdoutSampleBrier: number;
    holdoutSampleLogLoss: number;
    holdoutAccuracy: number;
    expectedCalibrationError: number;
  } | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const sportModels = modelEvaluations.filter((m) => m.sport === selectedSport);
  const activeEval =
    sportModels.find((m) => m.id === selectedEvalId) ||
    sportModels[0] ||
    modelEvaluations[0];

  const filteredPredictions = trackedPredictions.filter((p) =>
    predictionSportFilter === 'all' ? true : p.sport === predictionSportFilter
  );

  const handleRunChronologicalCheck = async () => {
    setIsRunningCheck(true);
    try {
      const resp = await fetch('/api/engine/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: selectedSport }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setValidationCheckResult(data.liveValidationCheck);
      }
    } finally {
      setIsRunningCheck(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sport Selector */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Statistical Engine Performance, Calibration & Prediction Tracking
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Evaluates sport-specific models using chronological walk-forward train/test splits (zero future-data leakage) and separates predictive calibration from simulated financial returns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg">
            {(['football', 'tennis', 'basketball', 'volleyball'] as SportSlug[]).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  setSelectedSport(sp);
                  const first = modelEvaluations.find((e) => e.sport === sp);
                  if (first) setSelectedEvalId(first.id);
                }}
                className={`px-3 py-1.5 text-xs font-medium capitalize rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedSport === sp
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {sp}
              </button>
            ))}
          </div>
        </div>

        {/* Model Version Switcher & Live Validation Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="model-version-select"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Active Model Architecture:
            </label>
            <select
              id="model-version-select"
              value={activeEval?.id || ''}
              onChange={(e) => setSelectedEvalId(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {sportModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.modelVersion} — {m.algorithmFamily} {m.isPrimaryActive ? '(Primary)' : '(Baseline)'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunChronologicalCheck}
            disabled={isRunningCheck}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isRunningCheck ? 'Verifying Split...' : 'Verify Chronological Split & Leakage Gate'}
          </button>
        </div>

        {validationCheckResult && (
          <div
            role="status"
            className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-mono tabular-nums"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Leakage Gate Verified: Max(Train Timestamp) &le; Min(Test Timestamp) ({validationCheckResult.cutoffTimestamp.slice(0, 10)})
              </span>
            </div>
            <div>
              Holdout Brier: {validationCheckResult.holdoutSampleBrier.toFixed(4)} · Log Loss:{' '}
              {validationCheckResult.holdoutSampleLogLoss.toFixed(4)} · ECE:{' '}
              {validationCheckResult.expectedCalibrationError.toFixed(4)}
            </div>
          </div>
        )}
      </section>

      {/* Selected Model Evaluation Metrics Strip */}
      {activeEval && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Brier Score (Lower Better)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {activeEval.brierScore.toFixed(4)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                vs 0.2500 random baseline
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Log Loss (Cross-Entropy)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {activeEval.logLoss.toFixed(4)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Out-of-sample N={activeEval.sampleSize}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Calibration Error (ECE)</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {(activeEval.expectedCalibrationError * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Reliability: {(activeEval.reliabilityScore * 100).toFixed(0)}%
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Classification Accuracy</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {(activeEval.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Chronological holdout
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Precision / Recall</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {(activeEval.precision * 100).toFixed(1)}% / {(activeEval.recall * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Threshold p &ge; 0.50
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 dark:text-slate-400">Validation Method</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1.5">
                Walk-Forward Split
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                {activeEval.validationPeriod}
              </div>
            </div>
          </div>

          {/* Calibration Reliability Chart + Market Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Probability Calibration Curve ({activeEval.modelVersion})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compares mean predicted probability against actual observed win frequency across 5 probability decile buckets.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={activeEval.calibrationCurve.map((b) => ({
                      binLabel: b.binLabel,
                      PredictedPct: Number((b.predictedMean * 100).toFixed(1)),
                      ObservedPct: Number((b.observedFrequency * 100).toFixed(1)),
                      Samples: b.sampleCount,
                    }))}
                    margin={{ top: 10, right: 16, left: -12, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                    <XAxis dataKey="binLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="ObservedPct"
                      name="Actual Observed Win %"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="PredictedPct"
                      name="Ideal Calibrated Mean %"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Performance by Prediction Market ({selectedSport.toUpperCase()})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Distinguishes statistical calibration (Brier / Log Loss) from hypothetical paper-betting ROI.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-3">Market</th>
                        <th className="py-2 px-2 text-right">Samples</th>
                        <th className="py-2 px-2 text-right">Accuracy</th>
                        <th className="py-2 px-2 text-right">Brier Score</th>
                        <th className="py-2 px-2 text-right">Log Loss</th>
                        <th className="py-2 pl-2 text-right">Simulated ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs font-mono tabular-nums">
                      {activeEval.marketBreakdown.map((mk, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 pr-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                            {mk.marketName}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-400">
                            {mk.sampleSize}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-800 dark:text-slate-200">
                            {(mk.accuracy * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-2 text-right text-blue-600 dark:text-blue-400 font-semibold">
                            {mk.brierScore.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-700 dark:text-slate-300">
                            {mk.logLoss.toFixed(3)}
                          </td>
                          <td
                            className={`py-2.5 pl-2 text-right font-semibold ${
                              mk.simulatedRoiPct >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {mk.simulatedRoiPct >= 0
                              ? `+${mk.simulatedRoiPct.toFixed(1)}%`
                              : `${mk.simulatedRoiPct.toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Architecture Summary: {activeEval.algorithmFamily}</span>
                </div>
                <p>{activeEval.description}</p>
                <div className="font-mono tabular-nums text-[11px] text-slate-500">
                  Training Window: {activeEval.trainingPeriod} · Validation: {activeEval.validationPeriod}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Immutable Pre-Match Prediction Tracking Ledger */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Immutable Pre-Match Prediction Audit Ledger
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every prediction is timestamped and locked prior to match start. Historical predictions are never overwritten when models are updated.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="pred-sport-filter"
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Filter Sport:
            </label>
            <select
              id="pred-sport-filter"
              value={predictionSportFilter}
              onChange={(e) => setPredictionSportFilter(e.target.value as SportSlug | 'all')}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Sports ({trackedPredictions.length})</option>
              <option value="football">Football</option>
              <option value="tennis">Tennis</option>
              <option value="basketball">Basketball</option>
              <option value="volleyball">Volleyball</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-3">Match & Sport</th>
                <th className="py-2.5 px-3">Market & Selection</th>
                <th className="py-2.5 px-3 text-right">Model Prob</th>
                <th className="py-2.5 px-3 text-right">Odds at Lock</th>
                <th className="py-2.5 px-3 text-right">EV at Lock</th>
                <th className="py-2.5 px-3">Model Version · Locked At</th>
                <th className="py-2.5 pl-3 text-right">Status & Settled Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
              {filteredPredictions.map((pred) => {
                const evPct = pred.expectedValue * 100;
                return (
                  <tr
                    key={pred.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => onInspectMatch(pred.matchId)}
                        className="font-medium text-left text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {pred.matchTitle}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="uppercase font-medium text-blue-600 dark:text-blue-400">
                          {pred.sport}
                        </span>
                        <span className="mx-1.5">·</span>
                        <span>{pred.competitionName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {pred.predictedSelection}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {pred.marketName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                      {(pred.modelProbability * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {pred.decimalOddsAtPrediction.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {evPct >= 0 ? `+${evPct.toFixed(2)}%` : `${evPct.toFixed(2)}%`}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <div>{pred.modelVersion}</div>
                      <div>Locked: {new Date(pred.predictionTimestamp).toLocaleDateString('en-GB')}</div>
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-xs">
                      <div
                        className={`font-semibold uppercase ${
                          pred.status === 'won'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : pred.status === 'lost'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {pred.status}
                      </div>
                      {pred.actualResultLabel && (
                        <div className="text-slate-500 dark:text-slate-400">
                          {pred.actualResultLabel} (Brier: {pred.brierScoreContribution?.toFixed(3)})
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
