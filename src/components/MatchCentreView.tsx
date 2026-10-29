import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  Sparkles,
  Lock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
} from 'lucide-react';
import { MatchRecord } from '../types/matchiq.ts';

interface MatchCentreViewProps {
  match: MatchRecord;
  allMatches: MatchRecord[];
  onSelectMatch: (matchId: string) => void;
  onBackToDashboard: () => void;
  onLockPrediction: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
  onSimulateBet: (matchId: string, marketKey: string, selectionKey: string) => Promise<void>;
  onRefreshAiAnalysis: (matchId: string) => Promise<void>;
  isRefreshingAi: boolean;
}

export const MatchCentreView: React.FC<MatchCentreViewProps> = ({
  match,
  allMatches,
  onSelectMatch,
  onBackToDashboard,
  onLockPrediction,
  onSimulateBet,
  onRefreshAiAnalysis,
  isRefreshingAi,
}) => {
  const [selectedMarketKey, setSelectedMarketKey] = useState<string>(
    match.markets[0]?.marketKey || ''
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeMarket =
    match.markets.find((m) => m.marketKey === selectedMarketKey) || match.markets[0];

  const handleLock = async (marketKey: string, selectionKey: string, label: string) => {
    await onLockPrediction(match.id, marketKey, selectionKey);
    setActionFeedback(`Locked pre-match prediction: ${label} (${activeMarket?.modelVersion})`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleBet = async (marketKey: string, selectionKey: string, label: string) => {
    await onSimulateBet(match.id, marketKey, selectionKey);
    setActionFeedback(`Logged simulated paper bet on ${label}`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Build comparative bar chart data tailored to the sport's specific metrics
  const buildComparisonChartData = () => {
    const stats = match.sportStats;
    if (stats.sport === 'football') {
      return [
        { metric: 'xG / 90', Home: stats.home.xgPer90, Away: stats.away.xgPer90 },
        { metric: 'Goals / 90', Home: stats.home.goalsScoredPer90, Away: stats.away.goalsScoredPer90 },
        { metric: 'xGA / 90', Home: stats.home.xgaPer90, Away: stats.away.xgaPer90 },
        { metric: 'Big Chances', Home: stats.home.bigChancesCreatedPer90, Away: stats.away.bigChancesCreatedPer90 },
        { metric: 'Shots on Target', Home: stats.home.shotsOnTargetPer90, Away: stats.away.shotsOnTargetPer90 },
        { metric: 'Corners / 90', Home: stats.home.cornersPer90, Away: stats.away.cornersPer90 },
      ];
    }
    if (stats.sport === 'tennis') {
      return [
        { metric: '1st Serve %', Home: stats.home.firstServePct, Away: stats.away.firstServePct },
        { metric: '1st Srv Won %', Home: stats.home.firstServePointsWonPct, Away: stats.away.firstServePointsWonPct },
        { metric: '2nd Srv Won %', Home: stats.home.secondServePointsWonPct, Away: stats.away.secondServePointsWonPct },
        { metric: 'Hold %', Home: stats.home.serviceGamesWonPct, Away: stats.away.serviceGamesWonPct },
        { metric: 'BP Saved %', Home: stats.home.breakPointsSavedPct, Away: stats.away.breakPointsSavedPct },
        { metric: 'Surface Win %', Home: stats.home.surfaceWinPct, Away: stats.away.surfaceWinPct },
      ];
    }
    if (stats.sport === 'basketball') {
      return [
        { metric: 'Off Rating', Home: stats.home.offensiveRating, Away: stats.away.offensiveRating },
        { metric: 'Def Rating', Home: stats.home.defensiveRating, Away: stats.away.defensiveRating },
        { metric: 'Pace', Home: stats.home.pace, Away: stats.away.pace },
        { metric: 'eFG %', Home: stats.home.effectiveFgPct, Away: stats.away.effectiveFgPct },
        { metric: 'Off Reb %', Home: stats.home.offensiveReboundPct, Away: stats.away.offensiveReboundPct },
        { metric: 'FT Rate', Home: stats.home.freeThrowRate, Away: stats.away.freeThrowRate },
      ];
    }
    return [
      { metric: 'Set Win %', Home: stats.home.setWinPct, Away: stats.away.setWinPct },
      { metric: 'Attack Eff %', Home: stats.home.attackEfficiencyPct, Away: stats.away.attackEfficiencyPct },
      { metric: 'Pos Reception %', Home: stats.home.positiveReceptionPct, Away: stats.away.positiveReceptionPct },
      { metric: 'Sideout %', Home: stats.home.sideoutSuccessPct, Away: stats.away.sideoutSuccessPct },
      { metric: '5th Set Win %', Home: stats.home.fifthSetWinPct, Away: stats.away.fifthSetWinPct },
    ];
  };

  const chartData = buildComparisonChartData();

  return (
    <div className="space-y-6">
      {/* Top Context Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="capitalize font-medium text-slate-800 dark:text-slate-200">
              {match.sport}
            </span>
            <span className="mx-1.5">·</span>
            <span>{match.competitionName}</span>
            <span className="mx-1.5">·</span>
            <span>{match.venueName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="match-Quick-Switch"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
          >
            Switch Match:
          </label>
          <select
            id="match-Quick-Switch"
            value={match.id}
            onChange={(e) => {
              onSelectMatch(e.target.value);
              setSelectedMarketKey('');
            }}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {allMatches.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.sport.toUpperCase()}] {m.homeParticipant.name} vs {m.awayParticipant.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className="flex items-center justify-between px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        </div>
      )}

      {/* Match Dossier Header */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase">
              {match.sport}
            </span>
            <span>·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {match.competitionName} ({match.competitionCategory})
            </span>
            <span>·</span>
            <span>{match.surfaceOrEnvironment}</span>
            <span>·</span>
            <span className="font-mono tabular-nums">
              {new Date(match.scheduledAt).toLocaleString('en-GB', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC',
              })}{' '}
              UTC
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Source: {match.sourceProvenance.providerName}</span>
            <span>·</span>
            <span>Freshness: {match.sourceProvenance.dataFreshnessMinutes}m ago</span>
          </div>
        </div>

        {/* Participants Head-to-Head Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Home Participant */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {match.sport === 'tennis' ? 'Player A' : 'Home Team'} · Rank #{match.homeParticipant.rankingOrSeed || '—'} ·{' '}
              {match.homeParticipant.country}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {match.homeParticipant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              <span>Elo: {match.homeParticipant.eloRating}</span>
              {match.homeParticipant.surfaceElo && (
                <>
                  <span>·</span>
                  <span>Indoor Elo: {match.homeParticipant.surfaceElo.indoor}</span>
                </>
              )}
              <span>·</span>
              <span>Rest: {match.homeParticipant.restDays}d</span>
              <span>·</span>
              <span>Form: {match.homeParticipant.recentForm.join('-')}</span>
            </div>
            {match.homeParticipant.injuriesOrAbsences.length > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                Availability: {match.homeParticipant.injuriesOrAbsences.join(', ')}
              </div>
            )}
          </div>

          {/* Center Score / Model Baseline Summary */}
          <div className="flex flex-col items-center justify-center py-3 px-4 border-y lg:border-y-0 lg:border-x border-slate-100 dark:border-slate-800 text-center">
            {match.status === 'completed' ? (
              <>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  Completed Result
                </div>
                <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {match.homeScore} — {match.awayScore}
                </div>
                {match.periodScores && (
                  <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
                    {match.periodScores.join(' · ')}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Primary Model Win Probability ({match.markets[0]?.modelVersion})
                </div>
                <div className="w-full max-w-xs space-y-1.5">
                  {match.markets[0]?.outcomes.map((o) => (
                    <div
                      key={o.selectionKey}
                      className="flex items-center justify-between text-xs font-mono tabular-nums"
                    >
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {o.selectionLabel}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {(o.modelProbability * 100).toFixed(1)}%
                        </span>
                        <span className="text-slate-400">vs</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Mkt {(o.fairMarketProbability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Away Participant */}
          <div className="space-y-2 lg:text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {match.sport === 'tennis' ? 'Player B' : 'Away Team'} · Rank #{match.awayParticipant.rankingOrSeed || '—'} ·{' '}
              {match.awayParticipant.country}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {match.awayParticipant.name}
            </h2>
            <div className="flex flex-wrap lg:justify-end items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              <span>Elo: {match.awayParticipant.eloRating}</span>
              {match.awayParticipant.surfaceElo && (
                <>
                  <span>·</span>
                  <span>Indoor Elo: {match.awayParticipant.surfaceElo.indoor}</span>
                </>
              )}
              <span>·</span>
              <span>Rest: {match.awayParticipant.restDays}d</span>
              <span>·</span>
              <span>Form: {match.awayParticipant.recentForm.join('-')}</span>
            </div>
            {match.awayParticipant.injuriesOrAbsences.length > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                Availability: {match.awayParticipant.injuriesOrAbsences.join(', ')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bookmaker Odds, Market-Implied Probabilities & Model Value Evaluation */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Prediction Markets, Bookmaker Odds & Margin-Free Probability Comparison
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compares raw decimal odds (`1 / Odds`), vig-removed fair market probabilities, and calibrated statistical model probabilities.
            </p>
          </div>

          {/* Interactive Market Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg">
            {match.markets.map((mk) => (
              <button
                key={mk.marketKey}
                type="button"
                onClick={() => setSelectedMarketKey(mk.marketKey)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeMarket?.marketKey === mk.marketKey
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {mk.marketName}
              </button>
            ))}
          </div>
        </div>

        {activeMarket && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div>
                <span>Engine: </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {activeMarket.algorithmName}
                </span>
                <span className="mx-1.5">·</span>
                <span className="font-mono tabular-nums">Version: {activeMarket.modelVersion}</span>
                <span className="mx-1.5">·</span>
                <span className="font-mono tabular-nums">
                  Calibration Reliability: {(activeMarket.modelReliability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="font-mono tabular-nums">
                Bookmaker Overround (Vig): {activeMarket.outcomes[0]?.overroundPct.toFixed(2)}%
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4">Selection</th>
                    <th className="py-2.5 px-3">Bookmaker</th>
                    <th className="py-2.5 px-3 text-right">Decimal Odds</th>
                    <th className="py-2.5 px-3 text-right">Raw Implied (1/Odds)</th>
                    <th className="py-2.5 px-3 text-right">Fair Market (No-Vig)</th>
                    <th className="py-2.5 px-3 text-right">Model Probability</th>
                    <th className="py-2.5 px-3 text-right">Expected Value (EV)</th>
                    <th className="py-2.5 pl-4 text-right">Research Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
                  {activeMarket.outcomes.map((outcome) => {
                    const evPct = outcome.expectedValue * 100;
                    return (
                      <tr
                        key={outcome.selectionKey}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                          {outcome.selectionLabel}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                          {outcome.bookmakerName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {outcome.decimalOdds.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {(outcome.rawImpliedProbability * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {(outcome.fairMarketProbability * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                          {(outcome.modelProbability * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          <span
                            className={`font-semibold ${
                              outcome.isValueFlagged
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : evPct > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {evPct >= 0 ? `+${evPct.toFixed(2)}%` : `${evPct.toFixed(2)}%`}
                            {outcome.isValueFlagged ? ' (+EV Verified)' : ''}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {match.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleLock(
                                    activeMarket.marketKey,
                                    outcome.selectionKey,
                                    outcome.selectionLabel
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                              >
                                <Lock className="w-3 h-3" />
                                Lock Prediction
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleBet(
                                  activeMarket.marketKey,
                                  outcome.selectionKey,
                                  outcome.selectionLabel
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                            >
                              <TrendingUp className="w-3 h-3" />
                              Simulate Bet
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
              <span>
                Analytical Note: Estimated positive expected value (+EV) reflects a mathematical divergence between the statistical model and bookmaker odds; it is not proof of guaranteed profitability.
              </span>
              <span className="font-mono tabular-nums">
                Odds Snapshot: {new Date(activeMarket.outcomes[0]?.capturedAt || '').toLocaleTimeString('en-GB')} UTC
              </span>
            </div>
          </>
        )}
      </section>

      {/* Two-Column Split: Sport-Specific Statistical Comparison + Head-to-Head & AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Sport-Specific Statistical Profile & H2H */}
        <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {match.sport.toUpperCase()} Quantitative Feature Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified pre-match statistical inputs fed into the {match.sport} prediction engine.
            </p>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
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
                    dataKey="Home"
                    name={match.homeParticipant.name}
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Away"
                    name={match.awayParticipant.name}
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Head-to-Head Summary */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Head-to-Head Record ({match.headToHead.totalMatches} Meetings)
              </h4>
              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {match.homeParticipant.shortCode} {match.headToHead.homeWins}W ·{' '}
                {match.headToHead.draws > 0 ? `${match.headToHead.draws}D · ` : ''}
                {match.awayParticipant.shortCode} {match.headToHead.awayWins}W
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {match.headToHead.surfaceOrVenueBreakdown}
            </p>
            {match.headToHead.lastMeetings.length > 0 && (
              <div className="space-y-1.5">
                {match.headToHead.lastMeetings.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 font-mono tabular-nums"
                  >
                    <span className="text-slate-500 dark:text-slate-400">{m.date}</span>
                    <span className="font-sans text-slate-700 dark:text-slate-300">{m.competition}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {m.scoreLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 6 Cols: AI Contextual Analysis (Strictly Separated from Mathematical Model) */}
        <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    AI-Assisted Contextual Analysis
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Provider: {match.aiAnalysis.llmProvider} ({match.aiAnalysis.llmModel}) · Grounded in structured match data
                </p>
              </div>

              <button
                type="button"
                disabled={isRefreshingAi}
                onClick={() => onRefreshAiAnalysis(match.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? 'animate-spin' : ''}`} />
                {isRefreshingAi ? 'Synthesizing...' : 'Refresh Gemini Analysis'}
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Recent Form & Statistical Context
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {match.aiAnalysis.recentFormAnalysis}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {match.homeParticipant.name} Strengths & Risks
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    {match.aiAnalysis.strengthsAndWeaknesses.homeStrengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    {match.aiAnalysis.strengthsAndWeaknesses.homeWeaknesses.map((w, i) => (
                      <li key={`w-${i}`} className="text-amber-700 dark:text-amber-400">
                        Vulnerability: {w}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {match.awayParticipant.name} Strengths & Risks
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                    {match.aiAnalysis.strengthsAndWeaknesses.awayStrengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    {match.aiAnalysis.strengthsAndWeaknesses.awayWeaknesses.map((w, i) => (
                      <li key={`w-${i}`} className="text-amber-700 dark:text-amber-400">
                        Vulnerability: {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Contextual & Tactical Factors
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {match.aiAnalysis.contextualFactors}
                </p>
              </div>

              {/* Uncertainties & Invalidation Factors */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Prediction Uncertainties & Invalidation Risks</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                  {match.aiAnalysis.uncertainties}
                </p>
                {match.aiAnalysis.invalidationFactors.length > 0 && (
                  <ul className="text-xs text-amber-800 dark:text-amber-300/90 list-disc list-inside space-y-0.5">
                    {match.aiAnalysis.invalidationFactors.map((inv, idx) => (
                      <li key={idx}>Invalidation Trigger: {inv}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Explicit Missing Data Warnings */}
              {match.aiAnalysis.missingDataWarnings.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Unavailable Data Disclosure (Never Fabricated)</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 list-disc list-inside space-y-0.5">
                    {match.aiAnalysis.missingDataWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>AI explanations interpret structured metrics; probabilities come strictly from statistical models.</span>
            <span>Generated: {new Date(match.aiAnalysis.generatedAt).toLocaleTimeString('en-GB')} UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
