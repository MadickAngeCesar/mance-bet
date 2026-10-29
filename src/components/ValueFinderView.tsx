import React, { useMemo, useState } from 'react';
import { Search, TrendingUp, Lock, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { MatchRecord, SportSlug } from '../types/matchiq.ts';

interface ValueFinderViewProps {
  matches: MatchRecord[];
  onInspectMatch: (matchId: string) => void;
  onLockPrediction: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
  onSimulateBet: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
}

export const ValueFinderView: React.FC<ValueFinderViewProps> = ({
  matches,
  onInspectMatch,
  onLockPrediction,
  onSimulateBet,
}) => {
  const [sportFilter, setSportFilter] = useState<SportSlug | 'all'>('all');
  const [competitionFilter, setCompetitionFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [minEvPct, setMinEvPct] = useState<number>(1.0);
  const [minModelProbPct, setMinModelProbPct] = useState<number>(35);
  const [minReliabilityPct, setMinReliabilityPct] = useState<number>(75);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyVerifiedPositiveEv, setOnlyVerifiedPositiveEv] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const competitions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (sportFilter === 'all' || m.sport === sportFilter) {
        set.add(m.competitionName);
      }
    });
    return Array.from(set);
  }, [matches, sportFilter]);

  const marketsList = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (sportFilter === 'all' || m.sport === sportFilter) {
        m.markets.forEach((mk) => set.add(mk.marketName));
      }
    });
    return Array.from(set);
  }, [matches, sportFilter]);

  const flattenedOpportunities = useMemo(() => {
    const rows: {
      id: string;
      matchId: string;
      sport: SportSlug;
      competitionName: string;
      matchTitle: string;
      scheduledAt: string;
      marketKey: string;
      marketName: string;
      selectionKey: string;
      selectionLabel: string;
      bookmakerName: string;
      decimalOdds: number;
      rawImpliedProbability: number;
      fairMarketProbability: number;
      overroundPct: number;
      modelProbability: number;
      expectedValue: number;
      modelReliability: number;
      modelVersion: string;
      dataFreshnessMinutes: number;
      isValueFlagged: boolean;
    }[] = [];

    matches
      .filter((m) => m.status === 'scheduled')
      .forEach((match) => {
        match.markets.forEach((mk) => {
          mk.outcomes.forEach((o) => {
            rows.push({
              id: `${match.id}-${mk.marketKey}-${o.selectionKey}`,
              matchId: match.id,
              sport: match.sport,
              competitionName: match.competitionName,
              matchTitle: `${match.homeParticipant.name} vs ${match.awayParticipant.name}`,
              scheduledAt: match.scheduledAt,
              marketKey: mk.marketKey,
              marketName: mk.marketName,
              selectionKey: o.selectionKey,
              selectionLabel: o.selectionLabel,
              bookmakerName: o.bookmakerName,
              decimalOdds: o.decimalOdds,
              rawImpliedProbability: o.rawImpliedProbability,
              fairMarketProbability: o.fairMarketProbability,
              overroundPct: o.overroundPct,
              modelProbability: o.modelProbability,
              expectedValue: o.expectedValue,
              modelReliability: mk.modelReliability,
              modelVersion: mk.modelVersion,
              dataFreshnessMinutes: match.sourceProvenance.dataFreshnessMinutes,
              isValueFlagged: o.isValueFlagged,
            });
          });
        });
      });

    return rows
      .filter((r) => (sportFilter === 'all' ? true : r.sport === sportFilter))
      .filter((r) => (competitionFilter === 'all' ? true : r.competitionName === competitionFilter))
      .filter((r) => (marketFilter === 'all' ? true : r.marketName === marketFilter))
      .filter((r) => r.expectedValue * 100 >= minEvPct)
      .filter((r) => r.modelProbability * 100 >= minModelProbPct)
      .filter((r) => r.modelReliability * 100 >= minReliabilityPct)
      .filter((r) => (onlyVerifiedPositiveEv ? r.isValueFlagged : true))
      .filter((r) =>
        searchQuery.trim()
          ? r.matchTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.selectionLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.competitionName.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      )
      .sort((a, b) => b.expectedValue - a.expectedValue);
  }, [
    matches,
    sportFilter,
    competitionFilter,
    marketFilter,
    minEvPct,
    minModelProbPct,
    minReliabilityPct,
    onlyVerifiedPositiveEv,
    searchQuery,
  ]);

  return (
    <div className="space-y-6">
      {/* Header & Mathematical Formula Disclosure */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Value Finder & Bookmaker Odds Margin Analyzer
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Scans verified multi-sport markets by stripping bookmaker overround and comparing fair market-implied probabilities against calibrated statistical models.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/90 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span>Implied Prob = 1 / Odds</span>
            <span>·</span>
            <span>Fair Prob = Implied / Σ(Implied)</span>
            <span>·</span>
            <span>EV = (Model Prob × Odds) - 1</span>
          </div>
        </div>

        {/* Epistemic Warning Banner */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-lg">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Discipline Notice: Estimated positive expected value (+EV) identifies mathematical pricing discrepancies relative to model calibration. It is not a guarantee of a winning outcome or financial profit.
          </span>
        </div>

        {/* Interactive Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
          <div>
            <label
              htmlFor="vf-sport"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Sport
            </label>
            <select
              id="vf-sport"
              value={sportFilter}
              onChange={(e) => {
                setSportFilter(e.target.value as SportSlug | 'all');
                setCompetitionFilter('all');
                setMarketFilter('all');
              }}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">All 4 Sports</option>
              <option value="football">Football (Soccer)</option>
              <option value="tennis">Tennis</option>
              <option value="basketball">Basketball</option>
              <option value="volleyball">Volleyball</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="vf-competition"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Competition
            </label>
            <select
              id="vf-competition"
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Competitions</option>
              {competitions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vf-market"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Market Type
            </label>
            <select
              id="vf-market"
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Markets</option>
              {marketsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vf-minev"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono tabular-nums"
            >
              Min Expected Value: {minEvPct >= 0 ? `+${minEvPct}%` : `${minEvPct}%`}
            </label>
            <input
              id="vf-minev"
              type="range"
              min={-10}
              max={12}
              step={0.5}
              value={minEvPct}
              onChange={(e) => setMinEvPct(Number(e.target.value))}
              className="w-full accent-blue-600 mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="vf-minprob"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono tabular-nums"
            >
              Min Model Prob: {minModelProbPct}%
            </label>
            <input
              id="vf-minprob"
              type="range"
              min={15}
              max={75}
              step={5}
              value={minModelProbPct}
              onChange={(e) => setMinModelProbPct(Number(e.target.value))}
              className="w-full accent-blue-600 mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="vf-search"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Search Participant / Selection
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="vf-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Arsenal, Sinner, Celtics..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlyVerifiedPositiveEv}
                onChange={(e) => setOnlyVerifiedPositiveEv(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show only selections passing all +EV Qualification Gates (EV &ge; +2.5%, Freshness &le; 180m)</span>
            </label>
          </div>
          <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Matching Selections: {flattenedOpportunities.length}
          </div>
        </div>
      </section>

      {feedbackBanner && (
        <div
          role="status"
          className="px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg"
        >
          {feedbackBanner}
        </div>
      )}

      {/* Results Table */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
        {flattenedOpportunities.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No market outcomes match your current EV and probability thresholds.
            </p>
            <button
              type="button"
              onClick={() => {
                setMinEvPct(-5);
                setMinModelProbPct(20);
                setOnlyVerifiedPositiveEv(false);
                setSportFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Reset Value Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3">Match & Competition</th>
                  <th className="py-2.5 px-3">Market & Selection</th>
                  <th className="py-2.5 px-3 text-right">Bookmaker Odds</th>
                  <th className="py-2.5 px-3 text-right">Fair Mkt Prob</th>
                  <th className="py-2.5 px-3 text-right">Model Prob</th>
                  <th className="py-2.5 px-3 text-right">Expected Value</th>
                  <th className="py-2.5 px-3 text-right">Reliability · Freshness</th>
                  <th className="py-2.5 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
                {flattenedOpportunities.map((row) => {
                  const evPct = row.expectedValue * 100;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {row.matchTitle}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="uppercase font-medium text-blue-600 dark:text-blue-400">
                            {row.sport}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span>{row.competitionName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {row.selectionLabel}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {row.marketName} · {row.bookmakerName} (Vig {row.overroundPct.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {row.decimalOdds.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {(row.fairMarketProbability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        {(row.modelProbability * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            row.isValueFlagged
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : evPct >= 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {evPct >= 0 ? `+${evPct.toFixed(2)}%` : `${evPct.toFixed(2)}%`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                        {(row.modelReliability * 100).toFixed(0)}% rel · {row.dataFreshnessMinutes}m
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInspectMatch(row.matchId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            Match Centre
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onLockPrediction(row.matchId, row.marketKey, row.selectionKey);
                              setFeedbackBanner(`Locked prediction: ${row.matchTitle} — ${row.selectionLabel}`);
                              setTimeout(() => setFeedbackBanner(null), 3500);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <Lock className="w-3 h-3" />
                            Lock
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onSimulateBet(row.matchId, row.marketKey, row.selectionKey);
                              setFeedbackBanner(`Simulated paper bet placed on ${row.selectionLabel}`);
                              setTimeout(() => setFeedbackBanner(null), 3500);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <TrendingUp className="w-3 h-3" />
                            Paper Bet
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
      </section>
    </div>
  );
};
