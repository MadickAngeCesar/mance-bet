import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Lock,
  TrendingUp,
  Scale,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  DataSyncLogEntry,
  MatchRecord,
  ModelEvaluationSummary,
  SimulatedBankrollState,
  SportSlug,
  TrackedPrediction,
} from '../types/matchiq.ts';

interface DashboardViewProps {
  matches: MatchRecord[];
  trackedPredictions: TrackedPrediction[];
  modelEvaluations: ModelEvaluationSummary[];
  simulatedBankroll: SimulatedBankrollState;
  syncLogs: DataSyncLogEntry[];
  onInspectMatch: (matchId: string) => void;
  onNavigateView: (
    view: 'dashboard' | 'match_centre' | 'value_finder' | 'performance' | 'simulation'
  ) => void;
  onLockPrediction: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
  onSimulateBet: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  matches,
  trackedPredictions,
  modelEvaluations,
  simulatedBankroll,
  syncLogs,
  onInspectMatch,
  onNavigateView,
  onLockPrediction,
  onSimulateBet,
}) => {
  const [sportFilter, setSportFilter] = useState<SportSlug | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [minConfidencePct, setMinConfidencePct] = useState<number>(40);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const scheduledMatches = useMemo(
    () => matches.filter((m) => m.status === 'scheduled'),
    [matches]
  );
  const completedMatches = useMemo(
    () => matches.filter((m) => m.status === 'completed'),
    [matches]
  );

  const availableCompetitions = useMemo(() => {
    const s = new Set<string>();
    scheduledMatches.forEach((m) => {
      if (sportFilter === 'all' || m.sport === sportFilter) {
        s.add(m.competitionName);
      }
    });
    return Array.from(s);
  }, [scheduledMatches, sportFilter]);

  const availableDates = useMemo(() => {
    const s = new Set<string>();
    scheduledMatches.forEach((m) => s.add(m.scheduledAt.slice(0, 10)));
    return Array.from(s).sort();
  }, [scheduledMatches]);

  const filteredUpcoming = useMemo(() => {
    return scheduledMatches.filter((m) => {
      if (sportFilter !== 'all' && m.sport !== sportFilter) return false;
      if (dateFilter !== 'all' && !m.scheduledAt.startsWith(dateFilter)) return false;
      if (competitionFilter !== 'all' && m.competitionName !== competitionFilter) return false;
      if (
        marketFilter !== 'all' &&
        !m.markets.some((mk) => mk.marketKey === marketFilter || mk.marketName === marketFilter)
      ) {
        return false;
      }
      const primaryMarket = m.markets[0];
      const maxProb = primaryMarket
        ? Math.max(...primaryMarket.outcomes.map((o) => o.modelProbability * 100))
        : 50;
      if (maxProb < minConfidencePct) return false;
      return true;
    });
  }, [
    scheduledMatches,
    sportFilter,
    dateFilter,
    competitionFilter,
    marketFilter,
    minConfidencePct,
  ]);

  // Highest-confidence calibrated predictions across all upcoming matches
  const highestConfidenceSelections = useMemo(() => {
    const items: {
      matchId: string;
      sport: SportSlug;
      matchTitle: string;
      competitionName: string;
      marketKey: string;
      marketName: string;
      selectionKey: string;
      selectionLabel: string;
      modelProbability: number;
      fairMarketProbability: number;
      decimalOdds: number;
      expectedValue: number;
      modelVersion: string;
      modelReliability: number;
    }[] = [];

    scheduledMatches.forEach((m) => {
      m.markets.forEach((mk) => {
        mk.outcomes.forEach((o) => {
          items.push({
            matchId: m.id,
            sport: m.sport,
            matchTitle: `${m.homeParticipant.name} vs ${m.awayParticipant.name}`,
            competitionName: m.competitionName,
            marketKey: mk.marketKey,
            marketName: mk.marketName,
            selectionKey: o.selectionKey,
            selectionLabel: o.selectionLabel,
            modelProbability: o.modelProbability,
            fairMarketProbability: o.fairMarketProbability,
            decimalOdds: o.decimalOdds,
            expectedValue: o.expectedValue,
            modelVersion: mk.modelVersion,
            modelReliability: mk.modelReliability,
          });
        });
      });
    });

    return items
      .filter((i) => i.modelReliability >= 0.8)
      .sort((a, b) => b.modelProbability - a.modelProbability)
      .slice(0, 5);
  }, [scheduledMatches]);

  // Aggregate KPI calculations
  const activeModels = modelEvaluations.filter((e) => e.isPrimaryActive);
  const avgBrierScore =
    activeModels.reduce((acc, m) => acc + m.brierScore, 0) / (activeModels.length || 1);
  const avgAccuracy =
    activeModels.reduce((acc, m) => acc + m.accuracy, 0) / (activeModels.length || 1);

  const verifiedValueCount = useMemo(() => {
    let count = 0;
    scheduledMatches.forEach((m) =>
      m.markets.forEach((mk) =>
        mk.outcomes.forEach((o) => {
          if (o.isValueFlagged) count++;
        })
      )
    );
    return count;
  }, [scheduledMatches]);

  return (
    <div className="space-y-6">
      {/* Epistemic Distinction Banner: 5 Analytical Pillars */}
      <section className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
              Multi-Sport Quantitative Analytics &amp; Probability Command Centre
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
              MatchIQ strictly separates statistical model probabilities, bookmaker implied probabilities (with margin removal), grounded AI contextual explanations, settled match outcomes, and hypothetical paper-betting performance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 px-3.5 py-2 rounded-lg">
            <Scale className="w-4 h-4 shrink-0" />
            <span>
              High model confidence does not equal positive expected value (+EV). Always evaluate model probability against bookmaker odds.
            </span>
          </div>
        </div>

        {/* Full-Width 4-Column KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              1. Statistical Model Calibration (4 Sports)
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {avgBrierScore.toFixed(4)} Brier
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {(avgAccuracy * 100).toFixed(1)}% Acc
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Football · Tennis · Basketball · Volleyball
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              2. Market Odds &amp; Verified +EV Candidates
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {verifiedValueCount} +EV Edges
              </span>
              <button
                type="button"
                onClick={() => onNavigateView('value_finder')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Value Finder &rarr;
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verified odds · Overround stripped · EV &ge; +2.5%
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              3. Pre-Match Prediction Tracking Audit
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {trackedPredictions.length} Locked
              </span>
              <button
                type="button"
                onClick={() => onNavigateView('performance')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Calibration Lab &rarr;
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Immutable pre-match timestamps · Zero overwrites
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              4. Hypothetical Paper-Betting Performance
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                +${simulatedBankroll.netProfitLoss.toFixed(2)}
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                +{simulatedBankroll.roiPct.toFixed(1)}% ROI
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
              Max DD: -{simulatedBankroll.maxDrawdownPct.toFixed(2)}% · Win Rate: {simulatedBankroll.winRatePct.toFixed(1)}%
            </div>
          </div>
        </div>
      </section>

      {quickToast && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{quickToast}</span>
        </div>
      )}

      {/* Interactive Filter Toolbar */}
      <section className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Interactive Segmented Sport Buttons */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg">
            {(
              [
                { key: 'all', label: `All Sports (${scheduledMatches.length})` },
                {
                  key: 'football',
                  label: `Football (${scheduledMatches.filter((m) => m.sport === 'football').length})`,
                },
                {
                  key: 'tennis',
                  label: `Tennis (${scheduledMatches.filter((m) => m.sport === 'tennis').length})`,
                },
                {
                  key: 'basketball',
                  label: `Basketball (${scheduledMatches.filter((m) => m.sport === 'basketball').length})`,
                },
                {
                  key: 'volleyball',
                  label: `Volleyball (${scheduledMatches.filter((m) => m.sport === 'volleyball').length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setSportFilter(tab.key);
                  setCompetitionFilter('all');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  sportFilter === tab.key
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="dash-date" className="sr-only">
                Date Filter
              </label>
              <select
                id="dash-date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Upcoming Dates</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    Date: {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dash-comp" className="sr-only">
                Competition Filter
              </label>
              <select
                id="dash-comp"
                value={competitionFilter}
                onChange={(e) => setCompetitionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Competitions</option>
                {availableCompetitions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dash-market" className="sr-only">
                Prediction Market Filter
              </label>
              <select
                id="dash-market"
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Prediction Markets</option>
                <option value="1x2">Football 1X2</option>
                <option value="over_under_25">Football O/U 2.5 Goals</option>
                <option value="match_winner">2-Way Match Winner</option>
                <option value="point_spread">Basketball Point Spread</option>
                <option value="set_handicap_15">Volleyball Set Handicap</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="dash-conf"
                className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap"
              >
                Min Confidence: {minConfidencePct}%
              </label>
              <input
                id="dash-conf"
                type="range"
                min={30}
                max={70}
                step={5}
                value={minConfidencePct}
                onChange={(e) => setMinConfidencePct(Number(e.target.value))}
                className="w-24 accent-blue-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Split: Upcoming Matches Grid (8 Cols) + Highest Confidence & Recent Results (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Upcoming Matches & Market Evaluations */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Upcoming Matches &amp; Model vs. Market Evaluations ({filteredUpcoming.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Click any match to open its full Match Centre dossier
            </span>
          </div>

          {filteredUpcoming.length === 0 ? (
            <div className="p-10 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No upcoming matches match the selected sport, competition, and confidence filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSportFilter('all');
                  setDateFilter('all');
                  setCompetitionFilter('all');
                  setMarketFilter('all');
                  setMinConfidencePct(35);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Reset Dashboard Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUpcoming.map((match) => {
                const primaryMarket = match.markets[0];
                return (
                  <article
                    key={match.id}
                    className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-4"
                  >
                    {/* Unboxed Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="uppercase font-semibold text-blue-600 dark:text-blue-400">
                          {match.sport}
                        </span>
                        <span>·</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {match.competitionName}
                        </span>
                        <span>·</span>
                        <span>{match.venueName}</span>
                        <span>·</span>
                        <span>{match.surfaceOrEnvironment}</span>
                      </div>
                      <div className="font-mono tabular-nums">
                        {new Date(match.scheduledAt).toLocaleString('en-GB', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </div>
                    </div>

                    {/* Match Title & Ratings */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => onInspectMatch(match.id)}
                          className="text-lg font-bold text-left text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {match.homeParticipant.name} vs {match.awayParticipant.name}
                        </button>
                        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                          Elo: {match.homeParticipant.shortCode} {match.homeParticipant.eloRating} vs{' '}
                          {match.awayParticipant.shortCode} {match.awayParticipant.eloRating} · Model:{' '}
                          {primaryMarket?.modelVersion} (Rel {(primaryMarket?.modelReliability * 100).toFixed(0)}%)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectMatch(match.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Inspect Match Centre
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Primary Market Outcomes Table */}
                    {primaryMarket && (
                      <div className="overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                              <th className="py-1.5 pr-3 font-medium">{primaryMarket.marketName}</th>
                              <th className="py-1.5 px-2 text-right font-medium">Decimal Odds</th>
                              <th className="py-1.5 px-2 text-right font-medium">Fair Market Prob</th>
                              <th className="py-1.5 px-2 text-right font-medium">Model Prob</th>
                              <th className="py-1.5 px-2 text-right font-medium">Expected Value</th>
                              <th className="py-1.5 pl-2 text-right font-medium">Quick Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono tabular-nums">
                            {primaryMarket.outcomes.map((o) => {
                              const evPct = o.expectedValue * 100;
                              return (
                                <tr key={o.selectionKey}>
                                  <td className="py-2 pr-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                                    {o.selectionLabel}
                                  </td>
                                  <td className="py-2 px-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                                    {o.decimalOdds.toFixed(2)}
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-500 dark:text-slate-400">
                                    {(o.fairMarketProbability * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-2 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                                    {(o.modelProbability * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <span
                                      className={`font-semibold ${
                                        o.isValueFlagged
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : evPct > 0
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {evPct >= 0 ? `+${evPct.toFixed(2)}%` : `${evPct.toFixed(2)}%`}
                                    </span>
                                  </td>
                                  <td className="py-2 pl-2 text-right font-sans">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await onLockPrediction(
                                            match.id,
                                            primaryMarket.marketKey,
                                            o.selectionKey
                                          );
                                          setQuickToast(
                                            `Locked pre-match prediction: ${o.selectionLabel}`
                                          );
                                          setTimeout(() => setQuickToast(null), 3500);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                      >
                                        <Lock className="w-2.5 h-2.5" />
                                        Lock
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await onSimulateBet(
                                            match.id,
                                            primaryMarket.marketKey,
                                            o.selectionKey
                                          );
                                          setQuickToast(
                                            `Logged simulated paper bet: ${o.selectionLabel} @ ${o.decimalOdds.toFixed(2)}`
                                          );
                                          setTimeout(() => setQuickToast(null), 3500);
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                                      >
                                        <TrendingUp className="w-2.5 h-2.5" />
                                        Bet
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Brief Grounded AI Takeaway */}
                    <div className="flex items-start gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          AI Context:{' '}
                        </span>
                        {match.aiAnalysis.recentFormAnalysis}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 4 Columns: Highest-Confidence Calibrated Predictions, Completed Results & Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Highest-Confidence Calibrated Predictions */}
          <section className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Highest-Confidence Calibrated Projections
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Filtered to models with &ge;80% historical calibration reliability. Note: high win probability does not imply positive EV if odds are short.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {highestConfidenceSelections.map((sel, idx) => (
                <div key={idx} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onInspectMatch(sel.matchId)}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left truncate max-w-[200px]"
                    >
                      {sel.selectionLabel}
                    </button>
                    <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {(sel.modelProbability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[180px]">
                      {sel.sport.toUpperCase()} · {sel.matchTitle}
                    </span>
                    <span className="font-mono tabular-nums">
                      Odds {sel.decimalOdds.toFixed(2)} · EV{' '}
                      {sel.expectedValue >= 0
                        ? `+${(sel.expectedValue * 100).toFixed(1)}%`
                        : `${(sel.expectedValue * 100).toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recently Completed Matches & Settled Audits */}
          <section className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recently Completed Matches &amp; Audits
              </h2>
              <button
                type="button"
                onClick={() => onNavigateView('performance')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Full Audit &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {completedMatches.map((m) => (
                <div key={m.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onInspectMatch(m.id)}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600"
                    >
                      {m.homeParticipant.name} vs {m.awayParticipant.name}
                    </button>
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                      {m.homeScore} - {m.awayScore}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {m.sport.toUpperCase()} · {m.competitionName} · Settled against pre-match lock
                  </div>
                </div>
              ))}
              {trackedPredictions
                .filter((p) => p.status !== 'pending')
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {p.predictedSelection} ({p.matchTitle})
                      </span>
                      <span
                        className={`font-mono tabular-nums font-semibold uppercase ${
                          p.status === 'won'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      Model {(p.modelProbability * 100).toFixed(1)}% · Brier:{' '}
                      {p.brierScoreContribution?.toFixed(3)} · {p.actualResultLabel}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Recent Synchronization Activity */}
          <section className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Provider Sync Activity
            </h2>
            <div className="space-y-2">
              {syncLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="text-xs space-y-0.5">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {log.providerName}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">{log.message}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
