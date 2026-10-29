-- =============================================================================
-- MatchIQ — Normalized PostgreSQL Database Schema & Row Level Security Migration
-- Supports: Football (Soccer), Tennis, Basketball, Volleyball
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & PREFERENCES
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_sport VARCHAR(32) NOT NULL DEFAULT 'all',
  min_ev_threshold NUMERIC(6,4) NOT NULL DEFAULT 0.0300,
  min_model_reliability NUMERIC(5,4) NOT NULL DEFAULT 0.7500,
  default_staking_strategy VARCHAR(32) NOT NULL DEFAULT 'kelly_fractional',
  theme VARCHAR(16) NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. SPORTS, COMPETITIONS, VENUES, TEAMS, PLAYERS
CREATE TABLE IF NOT EXISTS sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(32) NOT NULL UNIQUE CHECK (slug IN ('football', 'tennis', 'basketball', 'volleyball')),
  name VARCHAR(64) NOT NULL,
  scoring_unit VARCHAR(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  surface VARCHAR(64),
  is_indoor BOOLEAN NOT NULL DEFAULT FALSE,
  altitude_meters INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  external_id VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  country_or_tour VARCHAR(100) NOT NULL,
  category_tier VARCHAR(64) NOT NULL,
  surface_or_environment VARCHAR(64),
  season VARCHAR(32) NOT NULL,
  importance_factor NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sport_id, external_id, season)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  name VARCHAR(140) NOT NULL,
  short_code VARCHAR(12) NOT NULL,
  country VARCHAR(100) NOT NULL,
  elo_rating NUMERIC(7,2) NOT NULL DEFAULT 1500.00,
  offensive_rating NUMERIC(6,2),
  defensive_rating NUMERIC(6,2),
  pace_rating NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  full_name VARCHAR(140) NOT NULL,
  country VARCHAR(100) NOT NULL,
  current_ranking INTEGER,
  elo_overall NUMERIC(7,2) NOT NULL DEFAULT 1500.00,
  elo_hard NUMERIC(7,2) DEFAULT 1500.00,
  elo_clay NUMERIC(7,2) DEFAULT 1500.00,
  elo_grass NUMERIC(7,2) DEFAULT 1500.00,
  handedness VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DATA SOURCES & SYNC LOGS
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  adapter_key VARCHAR(64) NOT NULL UNIQUE,
  base_url VARCHAR(255),
  rate_limit_per_min INTEGER NOT NULL DEFAULT 30,
  last_status VARCHAR(32) NOT NULL DEFAULT 'healthy',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id) ON DELETE SET NULL,
  sync_type VARCHAR(32) NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. MATCHES & STATISTICS
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  home_player_id UUID REFERENCES players(id) ON DELETE RESTRICT,
  away_player_id UUID REFERENCES players(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('scheduled', 'live', 'completed', 'postponed')),
  home_score INTEGER,
  away_score INTEGER,
  period_scores_json JSONB DEFAULT '[]'::jsonb,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  external_match_id VARCHAR(128) NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, external_match_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_sport_scheduled ON matches(sport_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

CREATE TABLE IF NOT EXISTS match_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  side VARCHAR(16) NOT NULL CHECK (side IN ('home', 'away')),
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, side)
);

CREATE TABLE IF NOT EXISTS team_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season VARCHAR(32) NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  home_record VARCHAR(32),
  away_record VARCHAR(32),
  form_last_5 VARCHAR(16),
  metrics_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, competition_id, season)
);

CREATE TABLE IF NOT EXISTS player_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  surface VARCHAR(32) NOT NULL DEFAULT 'all',
  season VARCHAR(32) NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  hold_pct NUMERIC(5,2),
  break_pct NUMERIC(5,2),
  fatigue_workload_7d INTEGER DEFAULT 0,
  metrics_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, surface, season)
);

CREATE TABLE IF NOT EXISTS head_to_head_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  participant_a_id UUID NOT NULL,
  participant_b_id UUID NOT NULL,
  total_matches INTEGER NOT NULL DEFAULT 0,
  a_wins INTEGER NOT NULL DEFAULT 0,
  b_wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  surface_or_venue_splits_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_meeting_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sport_id, participant_a_id, participant_b_id)
);

-- 5. ODDS PROVIDERS, MARKETS & HISTORICAL BOOKMAKER ODDS
CREATE TABLE IF NOT EXISTS odds_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  typical_margin_pct NUMERIC(5,2) NOT NULL DEFAULT 2.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prediction_markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  market_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  outcomes_schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sport_id, market_key)
);

CREATE TABLE IF NOT EXISTS bookmaker_odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES odds_providers(id) ON DELETE RESTRICT,
  selection VARCHAR(64) NOT NULL,
  line NUMERIC(6,2),
  decimal_odds NUMERIC(8,3) NOT NULL CHECK (decimal_odds > 1.0),
  raw_implied_prob NUMERIC(6,4) NOT NULL,
  fair_no_vig_prob NUMERIC(6,4) NOT NULL,
  overround_pct NUMERIC(6,4) NOT NULL,
  is_closing_line BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookmaker_odds_match_market ON bookmaker_odds(match_id, market_id);

-- 6. MODELS, EVALUATIONS, IMMUTABLE PREDICTIONS & AI ANALYSES
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  algorithm_family VARCHAR(64) NOT NULL,
  version_tag VARCHAR(64) NOT NULL UNIQUE,
  hyperparameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_window_start DATE NOT NULL,
  training_window_end DATE NOT NULL,
  reliability_score NUMERIC(5,4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE RESTRICT,
  sample_size INTEGER NOT NULL,
  accuracy NUMERIC(6,4) NOT NULL,
  precision_score NUMERIC(6,4) NOT NULL,
  recall_score NUMERIC(6,4) NOT NULL,
  brier_score NUMERIC(6,4) NOT NULL,
  log_loss NUMERIC(6,4) NOT NULL,
  ece_calibration_error NUMERIC(6,4) NOT NULL,
  calibration_bins_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE RESTRICT,
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
  predicted_selection VARCHAR(64) NOT NULL,
  line NUMERIC(6,2),
  model_probability NUMERIC(6,4) NOT NULL CHECK (model_probability > 0 AND model_probability < 1),
  market_fair_probability_at_pred NUMERIC(6,4),
  best_decimal_odds_at_pred NUMERIC(8,3),
  expected_value NUMERIC(7,4),
  confidence_tier VARCHAR(32) NOT NULL,
  data_timestamp TIMESTAMPTZ NOT NULL,
  predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'push', 'void')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_match_model ON predictions(match_id, model_version_id);

CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL UNIQUE REFERENCES predictions(id) ON DELETE RESTRICT,
  actual_outcome VARCHAR(64) NOT NULL,
  actual_numeric_value NUMERIC(8,2),
  brier_contribution NUMERIC(6,4) NOT NULL,
  log_loss_contribution NUMERIC(6,4) NOT NULL,
  clv_edge NUMERIC(6,4),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE RESTRICT,
  llm_provider VARCHAR(64) NOT NULL DEFAULT 'google-gemini',
  llm_model VARCHAR(64) NOT NULL DEFAULT 'gemini-3.8-flash',
  recent_form_summary TEXT NOT NULL,
  strengths_weaknesses_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  historical_patterns TEXT NOT NULL,
  contextual_factors TEXT NOT NULL,
  uncertainties_and_risks TEXT NOT NULL,
  invalidation_factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_data_warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_snapshot_timestamp TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SIMULATED PAPER BETTING & BANKROLLS (USER-ISOLATED WITH RLS)
CREATE TABLE IF NOT EXISTS simulated_bankrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  initial_capital NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  peak_balance NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  max_drawdown_pct NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  staking_strategy VARCHAR(32) NOT NULL DEFAULT 'kelly_fractional',
  stake_param NUMERIC(8,4) NOT NULL DEFAULT 0.2500,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulated_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bankroll_id UUID NOT NULL REFERENCES simulated_bankrolls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
  prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
  market_id UUID NOT NULL REFERENCES prediction_markets(id) ON DELETE RESTRICT,
  selection VARCHAR(64) NOT NULL,
  line NUMERIC(6,2),
  stake_amount NUMERIC(12,2) NOT NULL CHECK (stake_amount > 0),
  decimal_odds NUMERIC(8,3) NOT NULL CHECK (decimal_odds > 1.0),
  closing_decimal_odds NUMERIC(8,3),
  model_prob_at_bet NUMERIC(6,4) NOT NULL,
  expected_value_at_bet NUMERIC(7,4) NOT NULL,
  potential_payout NUMERIC(12,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'push')),
  profit_loss NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulated_bets_user ON simulated_bets(user_id, placed_at DESC);

-- 8. ROW LEVEL SECURITY POLICIES FOR USER-SPECIFIC TABLES
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_bankrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulated_bets ENABLE ROW LEVEL SECURITY;
