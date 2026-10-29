import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  DataProviderStatus,
  DataSyncLogEntry,
  SportSlug,
} from '../types/matchiq.ts';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: DataProviderStatus[];
  syncLogs: DataSyncLogEntry[];
  onRunSync: (sport: SportSlug | 'all') => Promise<void>;
  onImportDataset: (format: 'csv' | 'json', payload: string) => Promise<{
    inserted: number;
    skippedDuplicate: number;
  }>;
}

const SAMPLE_CSV_DATASET = `externalId,sport,competitionName,homeName,awayName,homeElo,awayElo,homeDecimalOdds,drawDecimalOdds,awayDecimalOdds,bookmakerName
fb-laliga-2026-205,football,La Liga,FC Barcelona,Atletico Madrid,1955,1880,1.88,3.60,4.30,Pinnacle
tn-atp-paris-qf4,tennis,ATP Masters 1000 Paris,Alexander Zverev,Daniil Medvedev,2130,2105,1.84,,2.06,Pinnacle`;

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  isOpen,
  onClose,
  providers,
  syncLogs,
  onRunSync,
  onImportDataset,
}) => {
  const [syncSport, setSyncSport] = useState<SportSlug | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [importPayload, setImportPayload] = useState<string>(SAMPLE_CSV_DATASET);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setImportStatus(null);
    try {
      await onRunSync(syncSport);
      setImportStatus({
        type: 'success',
        message: `Idempotent synchronization completed for ${
          syncSport === 'all' ? 'all 4 sports' : syncSport
        }. Zero duplicate records created.`,
      });
    } catch (err: unknown) {
      setImportStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Synchronization failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus(null);
    if (!importPayload.trim()) {
      setImportStatus({
        type: 'error',
        message: 'Please provide a valid CSV or JSON dataset payload before importing.',
      });
      return;
    }

    try {
      const format =
        importPayload.trim().startsWith('[') || importPayload.trim().startsWith('{')
          ? 'json'
          : 'csv';
      const result = await onImportDataset(format, importPayload);
      setImportStatus({
        type: 'success',
        message: `Import complete: ${result.inserted} new matches modeled and added, ${result.skippedDuplicate} existing duplicates skipped.`,
      });
    } catch (err: unknown) {
      setImportStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Dataset import validation failed.',
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-sync-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2
                id="data-sync-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Sports Data Providers, Idempotent Sync & CSV/JSON Import Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modular provider adapters with duplicate prevention and custom historical/fixture dataset ingestion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Data Sync Modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {importStatus && (
            <div
              role="status"
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium rounded-lg border ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Provider Adapter Matrix + Manual Sync Trigger */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Configured Provider Adapters & Rate Limits
              </h3>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Select Sport for Sync"
                  value={syncSport}
                  onChange={(e) => setSyncSport(e.target.value as SportSlug | 'all')}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All 4 Sports</option>
                  <option value="football">Football</option>
                  <option value="tennis">Tennis</option>
                  <option value="basketball">Basketball</option>
                  <option value="volleyball">Volleyball</option>
                </select>
                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Synchronizing...' : 'Run Idempotent Sync'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3">Provider Adapter</th>
                    <th className="py-2 px-3">Sports</th>
                    <th className="py-2 px-3">Tier & Rate Limit</th>
                    <th className="py-2 px-3">Coverage</th>
                    <th className="py-2 px-3 text-right">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {providers.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-blue-600 dark:text-blue-400 font-medium">
                        {p.sportsSupported.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {p.rateLimit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {p.notes}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                        {new Date(p.lastSyncAt).toLocaleTimeString('en-GB')} UTC
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom CSV / JSON Importer */}
          <form onSubmit={handleImportSubmit} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Import Custom CSV or JSON Fixtures & Bookmaker Odds
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically runs the corresponding sport statistical engine (Dixon-Coles, Surface Elo, Four Factors, or Set Markov) and strips bookmaker overround upon import.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportPayload(SAMPLE_CSV_DATASET)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Load Sample La Liga &amp; ATP CSV
              </button>
            </div>

            <textarea
              aria-label="CSV or JSON Dataset Input"
              rows={4}
              value={importPayload}
              onChange={(e) => setImportPayload(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Validate, Model &amp; Import Dataset
              </button>
            </div>
          </form>

          {/* Synchronization Audit Logs */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Synchronization &amp; Deduplication Audit Logs ({syncLogs.length})
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg font-mono tabular-nums"
                >
                  <div className="font-sans text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      [{log.sport.toUpperCase()} · {log.syncType}]
                    </span>{' '}
                    {log.message}
                  </div>
                  <div className="text-slate-500">
                    Processed: {log.recordsProcessed} · New: {log.recordsInserted} · Skipped Dup:{' '}
                    {log.recordsSkippedDuplicate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
