/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Sun, Moon, LogIn, LogOut, Database } from 'lucide-react';
import {
  DataProviderStatus,
  DataSyncLogEntry,
  MatchRecord,
  ModelEvaluationSummary,
  SimulatedBankrollState,
  SportSlug,
  StakingStrategy,
  TrackedPrediction,
} from './types/matchiq.ts';
import {
  createInitialMatches,
  createInitialModelEvaluations,
  createInitialProviders,
  createInitialSimulatedBankroll,
  createInitialSyncLogs,
  createInitialTrackedPredictions,
} from './data/seedDataset.ts';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  saveLockedPredictionToFirestore,
  saveSimulatedBetToFirestore,
  settleSimulatedBetInFirestore,
} from './lib/firebase.ts';
import { DashboardView } from './components/DashboardView.tsx';
import { MatchCentreView } from './components/MatchCentreView.tsx';
import { ValueFinderView } from './components/ValueFinderView.tsx';
import { PerformanceAnalyticsView } from './components/PerformanceAnalyticsView.tsx';
import { SimulatedBettingView } from './components/SimulatedBettingView.tsx';
import { DataSyncModal } from './components/DataSyncModal.tsx';

type ActiveView =
  | 'dashboard'
  | 'match_centre'
  | 'value_finder'
  | 'performance'
  | 'simulation';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [matches, setMatches] = useState<MatchRecord[]>(() => createInitialMatches());
  const [selectedMatchId, setSelectedMatchId] = useState<string>('match-fb-ars-liv');
  const [trackedPredictions, setTrackedPredictions] = useState<TrackedPrediction[]>(() =>
    createInitialTrackedPredictions()
  );
  const [modelEvaluations, setModelEvaluations] = useState<ModelEvaluationSummary[]>(() =>
    createInitialModelEvaluations()
  );
  const [simulatedBankroll, setSimulatedBankroll] = useState<SimulatedBankrollState>(() =>
    createInitialSimulatedBankroll()
  );
  const [providers, setProviders] = useState<DataProviderStatus[]>(() =>
    createInitialProviders()
  );
  const [syncLogs, setSyncLogs] = useState<DataSyncLogEntry[]>(() =>
    createInitialSyncLogs()
  );

  const [isDark, setIsDark] = useState<boolean>(true);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isRefreshingAi, setIsRefreshingAi] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // Hydrate from server /api/bootstrap
  useEffect(() => {
    fetch('/api/bootstrap')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          if (Array.isArray(data.matches) && data.matches.length > 0) setMatches(data.matches);
          if (Array.isArray(data.trackedPredictions)) setTrackedPredictions(data.trackedPredictions);
          if (Array.isArray(data.modelEvaluations)) setModelEvaluations(data.modelEvaluations);
          if (data.simulatedBankroll) setSimulatedBankroll(data.simulatedBankroll);
          if (Array.isArray(data.providers)) setProviders(data.providers);
          if (Array.isArray(data.syncLogs)) setSyncLogs(data.syncLogs);
        }
      })
      .catch(() => {
        // Fallback to verified local state if server is warming up
      });
  }, []);

  const selectedMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0];

  const handleInspectMatch = (matchId: string) => {
    const exists = matches.find((m) => m.id === matchId);
    if (exists) {
      setSelectedMatchId(matchId);
      setActiveView('match_centre');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLockPrediction = async (
    matchId: string,
    marketKey: string,
    selectionKey: string
  ) => {
    const resp = await fetch('/api/predictions/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, marketKey, selectionKey }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.trackedPredictions)) {
        setTrackedPredictions(data.trackedPredictions);
      }
      if (data.prediction && currentUser) {
        await saveLockedPredictionToFirestore({
          id: data.prediction.id,
          matchId: data.prediction.matchId,
          sport: data.prediction.sport,
          marketKey: data.prediction.marketKey,
          selection: data.prediction.predictedSelection,
          modelProbability: data.prediction.modelProbability,
          decimalOdds: data.prediction.decimalOddsAtPrediction,
          expectedValue: data.prediction.expectedValue,
          modelVersion: data.prediction.modelVersion,
        });
      }
    }
  };

  const handleSimulateBet = async (
    matchId: string,
    marketKey: string,
    selectionKey: string,
    stakingStrategy?: StakingStrategy,
    customStake?: number
  ) => {
    const resp = await fetch('/api/simulation/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        marketKey,
        selectionKey,
        stakingStrategy,
        customStake,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.simulatedBankroll) {
        setSimulatedBankroll(data.simulatedBankroll);
      }
      if (data.bet && currentUser) {
        await saveSimulatedBetToFirestore({
          id: data.bet.id,
          matchId: data.bet.matchId,
          matchLabel: data.bet.matchTitle,
          sport: data.bet.sport,
          marketName: data.bet.marketName,
          selection: data.bet.selectionLabel,
          stake: data.bet.stakeAmount,
          decimalOdds: data.bet.decimalOdds,
          modelProbability: data.bet.modelProbability,
          expectedValue: data.bet.expectedValue,
          stakingStrategy: data.bet.stakingStrategy,
        });
      }
    }
  };

  const handleSettleBet = async (
    betId: string,
    outcomeStatus: 'won' | 'lost' | 'push'
  ) => {
    const resp = await fetch('/api/simulation/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betId, outcomeStatus }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.simulatedBankroll) {
        setSimulatedBankroll(data.simulatedBankroll);
      }
      if (data.bet && currentUser) {
        await settleSimulatedBetInFirestore({
          id: data.bet.id,
          status: data.bet.status,
          profitLoss: data.bet.profitLoss,
        });
      }
    }
  };

  const handleUpdateStakingConfig = async (params: {
    stakingStrategy: StakingStrategy;
    flatUnitAmount: number;
    kellyFraction: number;
    percentageRate: number;
  }) => {
    const resp = await fetch('/api/simulation/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.simulatedBankroll) {
        setSimulatedBankroll(data.simulatedBankroll);
      }
    }
  };

  const handleRefreshAiAnalysis = async (matchId: string) => {
    setIsRefreshingAi(true);
    try {
      const resp = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.aiAnalysis) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId ? { ...m, aiAnalysis: data.aiAnalysis } : m
            )
          );
        }
      }
    } finally {
      setIsRefreshingAi(false);
    }
  };

  const handleRunSync = async (sport: SportSlug | 'all') => {
    const resp = await fetch('/api/sync/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.matches)) setMatches(data.matches);
      if (Array.isArray(data.providers)) setProviders(data.providers);
      if (Array.isArray(data.syncLogs)) setSyncLogs(data.syncLogs);
    }
  };

  const handleImportDataset = async (
    format: 'csv' | 'json',
    payload: string
  ): Promise<{ inserted: number; skippedDuplicate: number }> => {
    const resp = await fetch('/api/import/dataset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, payload }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Import failed');
    }
    if (Array.isArray(data.matches)) setMatches(data.matches);
    if (Array.isArray(data.syncLogs)) setSyncLogs(data.syncLogs);
    return {
      inserted: data.inserted || 0,
      skippedDuplicate: data.skippedDuplicate || 0,
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        data-testid="top-navbar"
        className="flex items-center justify-between gap-8 px-6 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800"
      >
        {/* Zone 1: Single text element Brand Wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          MatchIQ
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="#dashboard"
            data-testid="nav-dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('dashboard');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'dashboard'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Dashboard
          </a>
          <a
            href="#match-centre"
            data-testid="nav-match_centre"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('match_centre');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'match_centre'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Match Centre
          </a>
          <a
            href="#value-finder"
            data-testid="nav-value_finder"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('value_finder');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'value_finder'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Value Finder
          </a>
          <a
            href="#performance-lab"
            data-testid="nav-performance"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('performance');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'performance'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Performance Lab
          </a>
          <a
            href="#simulated-betting"
            data-testid="nav-simulation"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('simulation');
            }}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'simulation'
                ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Simulated Betting
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            data-testid="btn-sync-modal"
            onClick={() => setIsSyncModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Data Sync &amp; Import
          </button>
        </div>
      </header>

      {/* Workspace Utility Sub-Toolbar (Mobile Navigation + Theme + Firebase Analyst Auth) */}
      <div className="bg-slate-100/80 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Mobile / Compact View Switcher */}
          <div className="flex md:hidden flex-wrap items-center gap-1">
            {(
              [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'match_centre', label: 'Match Centre' },
                { id: 'value_finder', label: 'Value Finder' },
                { id: 'performance', label: 'Performance' },
                { id: 'simulation', label: 'Paper Betting' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveView(v.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  activeView === v.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Sports Active: Football · Tennis · Basketball · Volleyball</span>
            <span>·</span>
            <span>Mode: Analysis &amp; Simulated Paper Betting</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {authError && (
              <span className="text-xs text-rose-600 dark:text-rose-400">{authError}</span>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 whitespace-nowrap"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setAuthError(null);
                  try {
                    await signInWithGoogle();
                  } catch {
                    setAuthError('Popup sign-in cancelled or blocked by browser.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3 h-3" />
                Analyst Sign In (Cloud Sync)
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container (1440px Desktop Baseline) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-6">
        {activeView === 'dashboard' && (
          <DashboardView
            matches={matches}
            trackedPredictions={trackedPredictions}
            modelEvaluations={modelEvaluations}
            simulatedBankroll={simulatedBankroll}
            syncLogs={syncLogs}
            onInspectMatch={handleInspectMatch}
            onNavigateView={setActiveView}
            onLockPrediction={handleLockPrediction}
            onSimulateBet={handleSimulateBet}
          />
        )}

        {activeView === 'match_centre' && selectedMatch && (
          <MatchCentreView
            match={selectedMatch}
            allMatches={matches}
            onSelectMatch={(id) => setSelectedMatchId(id)}
            onBackToDashboard={() => setActiveView('dashboard')}
            onLockPrediction={handleLockPrediction}
            onSimulateBet={handleSimulateBet}
            onRefreshAiAnalysis={handleRefreshAiAnalysis}
            isRefreshingAi={isRefreshingAi}
          />
        )}

        {activeView === 'value_finder' && (
          <ValueFinderView
            matches={matches}
            onInspectMatch={handleInspectMatch}
            onLockPrediction={handleLockPrediction}
            onSimulateBet={handleSimulateBet}
          />
        )}

        {activeView === 'performance' && (
          <PerformanceAnalyticsView
            modelEvaluations={modelEvaluations}
            trackedPredictions={trackedPredictions}
            onInspectMatch={handleInspectMatch}
          />
        )}

        {activeView === 'simulation' && (
          <SimulatedBettingView
            bankroll={simulatedBankroll}
            matches={matches}
            onPlaceBet={(p) =>
              handleSimulateBet(
                p.matchId,
                p.marketKey,
                p.selectionKey,
                p.stakingStrategy,
                p.customStake
              )
            }
            onSettleBet={handleSettleBet}
            onUpdateStakingConfig={handleUpdateStakingConfig}
          />
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="mt-12 px-6 py-5 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            MatchIQ Quantitative Multi-Sport Analytics · Football · Tennis · Basketball · Volleyball
          </div>
          <div>
            Strictly for statistical research and simulated paper-betting evaluation. Predictions are probabilistic estimates and are never guaranteed.
          </div>
        </div>
      </footer>

      {/* Data Sync & CSV/JSON Import Modal */}
      <DataSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        providers={providers}
        syncLogs={syncLogs}
        onRunSync={handleRunSync}
        onImportDataset={handleImportDataset}
      />
    </div>
  );
}
