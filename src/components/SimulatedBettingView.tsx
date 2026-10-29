import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calculator,
} from 'lucide-react';
import {
  MatchRecord,
  SimulatedBankrollState,
  StakingStrategy,
} from '../types/matchiq.ts';
import { calculateSimulatedStake } from '../engine/odds.ts';

interface SimulatedBettingViewProps {
  bankroll: SimulatedBankrollState;
  matches: MatchRecord[];
  onPlaceBet: (params: {
    matchId: string;
    marketKey: string;
    selectionKey: string;
    stakingStrategy: StakingStrategy;
    customStake?: number;
  }) => Promise<void>;
  onSettleBet: (betId: string, outcomeStatus: 'won' | 'lost' | 'push') => Promise<void>;
  onUpdateStakingConfig: (params: {
    stakingStrategy: StakingStrategy;
    flatUnitAmount: number;
    kellyFraction: number;
    percentageRate: number;
  }) => Promise<void>;
}

export const SimulatedBettingView: React.FC<SimulatedBettingViewProps> = ({
  bankroll,
  matches,
  onPlaceBet,
  onSettleBet,
  onUpdateStakingConfig,
}) => {
  const scheduledMatches = matches.filter((m) => m.status === 'scheduled');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    scheduledMatches[0]?.id || ''
  );
  const [selectedMarketKey, setSelectedMarketKey] = useState<string>(
    scheduledMatches[0]?.markets[0]?.marketKey || ''
  );
  const [selectedSelectionKey, setSelectedSelectionKey] = useState<string>(
    scheduledMatches[0]?.markets[0]?.outcomes[0]?.selectionKey || ''
  );
  const [stakingStrategy, setStakingStrategy] = useState<StakingStrategy>(
    bankroll.stakingStrategy
  );
  const [flatUnit, setFlatUnit] = useState<number>(bankroll.flatUnitAmount);
  const [kellyFraction, setKellyFraction] = useState<number>(bankroll.kellyFraction);
  const [percentageRate, setPercentageRate] = useState<number>(bankroll.percentageRate);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentMatch =
    scheduledMatches.find((m) => m.id === selectedMatchId) || scheduledMatches[0];
  const currentMarket =
    currentMatch?.markets.find((mk) => mk.marketKey === selectedMarketKey) ||
    currentMatch?.markets[0];
  const currentOutcome =
    currentMarket?.outcomes.find((o) => o.selectionKey === selectedSelectionKey) ||
    currentMarket?.outcomes[0];

  const recommendedStake = currentOutcome
    ? calculateSimulatedStake({
        bankroll: bankroll.currentBalance,
        strategy: stakingStrategy,
        modelProbability: currentOutcome.modelProbability,
        decimalOdds: currentOutcome.decimalOdds,
        flatUnit,
        kellyFraction,
        percentageRate,
      })
    : 100;

  const handlePlacePaperBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMatch || !currentMarket || !currentOutcome) return;

    await onUpdateStakingConfig({
      stakingStrategy,
      flatUnitAmount: flatUnit,
      kellyFraction,
      percentageRate,
    });

    await onPlaceBet({
      matchId: currentMatch.id,
      marketKey: currentMarket.marketKey,
      selectionKey: currentOutcome.selectionKey,
      stakingStrategy,
      customStake: recommendedStake,
    });

    setFeedback(
      `Placed simulated paper bet: $${recommendedStake.toFixed(2)} on ${currentOutcome.selectionLabel} @ ${currentOutcome.decimalOdds.toFixed(2)}`
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Non-Gambling Simulation Disclosure */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Simulated Paper-Betting & Virtual Bankroll Research Lab
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Evaluates staking strategies (Fractional Kelly Criterion, Flat Unit, Fixed Percentage) in a strictly simulated environment. No real bets or bookmaker account transactions ever occur.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Fund: {bankroll.name}
          </div>
        </div>

        {/* 6 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Virtual Bankroll</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              ${bankroll.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
              Start: ${bankroll.initialCapital.toLocaleString('en-US')}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Simulated Net P&amp;L</div>
            <div
              className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                bankroll.netProfitLoss >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {bankroll.netProfitLoss >= 0
                ? `+$${bankroll.netProfitLoss.toFixed(2)}`
                : `-$${Math.abs(bankroll.netProfitLoss).toFixed(2)}`}
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
              Staked: ${bankroll.totalStaked.toFixed(0)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Simulated ROI</div>
            <div
              className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                bankroll.roiPct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {bankroll.roiPct >= 0 ? `+${bankroll.roiPct.toFixed(2)}%` : `${bankroll.roiPct.toFixed(2)}%`}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Yield on settled turnover</div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Max Drawdown</div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              -{bankroll.maxDrawdownPct.toFixed(2)}%
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
              Peak: ${bankroll.peakBalance.toFixed(0)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Settled Win Rate</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {bankroll.winRatePct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {bankroll.bets.filter((b) => b.status === 'open').length} open ·{' '}
              {bankroll.bets.filter((b) => b.status !== 'open').length} settled
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400">Closing Line Edge (CLV)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
              +{bankroll.averageClvEdgePct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">vs Pinnacle closing odds</div>
          </div>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className="px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg"
        >
          {feedback}
        </div>
      )}

      {/* 2-Column Split: Paper-Betting Slip & Staking Strategy + Equity Curve Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 5 Cols: Staking Configurator & Paper Bet Ticket */}
        <form
          onSubmit={handlePlacePaperBet}
          className="lg:col-span-5 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Staking Strategy & Paper-Bet Simulator
              </h2>
            </div>

            {/* Staking Strategy Segmented Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Research Staking Algorithm
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    { key: 'kelly_fractional', label: 'Fractional Kelly' },
                    { key: 'flat', label: 'Flat Unit' },
                    { key: 'percentage', label: '% Bankroll' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStakingStrategy(st.key)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      stakingStrategy === st.key
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {stakingStrategy === 'kelly_fractional' && (
              <div>
                <label
                  htmlFor="kelly-frac-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono tabular-nums"
                >
                  Kelly Fraction Multiplier: {(kellyFraction * 100).toFixed(0)}% Kelly
                </label>
                <input
                  id="kelly-frac-input"
                  type="range"
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={kellyFraction}
                  onChange={(e) => setKellyFraction(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {stakingStrategy === 'flat' && (
              <div>
                <label
                  htmlFor="flat-unit-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono tabular-nums"
                >
                  Flat Stake Unit ($ USD): ${flatUnit}
                </label>
                <input
                  id="flat-unit-input"
                  type="number"
                  min={10}
                  max={2000}
                  value={flatUnit}
                  onChange={(e) => setFlatUnit(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            )}

            {stakingStrategy === 'percentage' && (
              <div>
                <label
                  htmlFor="pct-rate-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono tabular-nums"
                >
                  Bankroll Percentage per Selection: {(percentageRate * 100).toFixed(1)}%
                </label>
                <input
                  id="pct-rate-input"
                  type="range"
                  min={0.01}
                  max={0.08}
                  step={0.005}
                  value={percentageRate}
                  onChange={(e) => setPercentageRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            {/* Match & Market Selection */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label
                  htmlFor="sim-match-select"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                >
                  Upcoming Match
                </label>
                <select
                  id="sim-match-select"
                  value={currentMatch?.id || ''}
                  onChange={(e) => {
                    const m = scheduledMatches.find((item) => item.id === e.target.value);
                    setSelectedMatchId(e.target.value);
                    setSelectedMarketKey(m?.markets[0]?.marketKey || '');
                    setSelectedSelectionKey(m?.markets[0]?.outcomes[0]?.selectionKey || '');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {scheduledMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.sport.toUpperCase()}] {m.homeParticipant.name} vs {m.awayParticipant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="sim-market-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Market
                  </label>
                  <select
                    id="sim-market-select"
                    value={currentMarket?.marketKey || ''}
                    onChange={(e) => {
                      const mk = currentMatch?.markets.find(
                        (item) => item.marketKey === e.target.value
                      );
                      setSelectedMarketKey(e.target.value);
                      setSelectedSelectionKey(mk?.outcomes[0]?.selectionKey || '');
                    }}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {currentMatch?.markets.map((mk) => (
                      <option key={mk.marketKey} value={mk.marketKey}>
                        {mk.marketName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sim-selection-select"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Selection & Odds
                  </label>
                  <select
                    id="sim-selection-select"
                    value={currentOutcome?.selectionKey || ''}
                    onChange={(e) => setSelectedSelectionKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {currentMarket?.outcomes.map((o) => (
                      <option key={o.selectionKey} value={o.selectionKey}>
                        {o.selectionLabel} @ {o.decimalOdds.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Computed Ticket Preview */}
            {currentOutcome && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-500">Model Prob vs Fair Market:</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">
                    {(currentOutcome.modelProbability * 100).toFixed(1)}% vs{' '}
                    {(currentOutcome.fairMarketProbability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expected Value (EV):</span>
                  <span
                    className={
                      currentOutcome.expectedValue >= 0
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {currentOutcome.expectedValue >= 0
                      ? `+${(currentOutcome.expectedValue * 100).toFixed(2)}%`
                      : `${(currentOutcome.expectedValue * 100).toFixed(2)}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Computed Hypothetical Stake:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    ${recommendedStake.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hypothetical Return (If Won):</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold">
                    ${(recommendedStake * currentOutcome.decimalOdds).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Log Simulated Paper Bet (${recommendedStake.toFixed(2)})
          </button>
        </form>

        {/* Right 7 Cols: Equity & Drawdown Chart */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Simulated Bankroll Equity Trajectory
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tracks hypothetical capital growth and drawdown across settled paper bets.
                </p>
              </div>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={bankroll.equityHistory}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    domain={['dataMin - 200', 'dataMax + 200']}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Virtual Balance ($)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#equityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Note: Settling open bets below immediately updates the equity curve, ROI %, and maximum drawdown calculation.
          </div>
        </div>
      </div>

      {/* Simulated Bets Ledger Table */}
      <section className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Paper-Betting Audit Ledger ({bankroll.bets.length} Entries)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Includes staking strategy provenance, closing-line odds comparison, and interactive research settlement controls.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-3">Match & Sport</th>
                <th className="py-2.5 px-3">Selection & Strategy</th>
                <th className="py-2.5 px-3 text-right">Stake</th>
                <th className="py-2.5 px-3 text-right">Odds (Closing)</th>
                <th className="py-2.5 px-3 text-right">Model Prob · EV</th>
                <th className="py-2.5 px-3 text-right">Profit / Loss</th>
                <th className="py-2.5 pl-3 text-right">Status / Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-sm">
              {bankroll.bets.map((bet) => (
                <tr
                  key={bet.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {bet.matchTitle}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="uppercase font-medium text-blue-600 dark:text-blue-400">
                        {bet.sport}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>{bet.competitionName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {bet.selectionLabel}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {bet.marketName} · {bet.stakingStrategy.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    ${bet.stakeAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {bet.decimalOdds.toFixed(2)}
                    {bet.closingDecimalOdds ? (
                      <span className="text-xs text-slate-400 ml-1">
                        (CL: {bet.closingDecimalOdds.toFixed(2)})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {(bet.modelProbability * 100).toFixed(1)}%
                    </span>
                    <span className="mx-1">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {bet.expectedValue >= 0
                        ? `+${(bet.expectedValue * 100).toFixed(1)}%`
                        : `${(bet.expectedValue * 100).toFixed(1)}%`}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                      bet.status === 'open'
                        ? 'text-slate-400'
                        : bet.profitLoss > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : bet.profitLoss < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {bet.status === 'open'
                      ? `Pot. +$${(bet.potentialPayout - bet.stakeAmount).toFixed(2)}`
                      : bet.profitLoss >= 0
                      ? `+$${bet.profitLoss.toFixed(2)}`
                      : `-$${Math.abs(bet.profitLoss).toFixed(2)}`}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    {bet.status === 'open' ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSettleBet(bet.id, 'won')}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Settle Won
                        </button>
                        <button
                          type="button"
                          onClick={() => onSettleBet(bet.id, 'lost')}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded transition-colors whitespace-nowrap"
                        >
                          <XCircle className="w-3 h-3" />
                          Settle Lost
                        </button>
                        <button
                          type="button"
                          onClick={() => onSettleBet(bet.id, 'push')}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded transition-colors whitespace-nowrap"
                        >
                          <MinusCircle className="w-3 h-3" />
                          Push
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-mono uppercase font-semibold ${
                          bet.status === 'won'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : bet.status === 'lost'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {bet.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
