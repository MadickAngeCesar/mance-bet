# MatchIQ — AI-Powered Multi-Sport Analytics & Prediction Platform

MatchIQ is a production-grade quantitative sports analytics, probability estimation, bookmaker odds evaluation, and simulated paper-betting platform supporting **Football (Soccer)**, **Tennis**, **Basketball**, and **Volleyball**. It strictly separates mathematically calibrated statistical models, market-implied probabilities (with bookmaker margin removal), AI-assisted contextual interpretation, actual match outcomes, and hypothetical paper-betting performance.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product decisions incorporate your confirmed selections from Phase 1 and align the platform for immediate execution upon approval.

- **Confirmed Decision 1 — Database & Statistical Runtime**: Provision a managed **Cloud SQL (PostgreSQL)** instance with **Drizzle ORM**, **Firebase Authentication** (with user-level access isolation), and a modular **Express + TypeScript Statistical & ML Engine** running natively in the full-stack server environment.
- **Confirmed Decision 2 — Sports Data Sourcing & Provenance**: Implement modular sport-specific provider adapters connecting to free public sports endpoints (**TheSportsDB**, **Football-data.org**, open historical repositories) paired with a verified, clearly labeled multi-sport historical & upcoming dataset and an interactive **CSV / JSON Data Import Studio** so all four sports work out of the box without fabricating live data.
- **Confirmed Decision 3 — First Implementation Milestone Scope**: Deliver the **full multi-sport MVP across all 4 sports (Football, Tennis, Basketball, Volleyball)** and all 9 core application modules in the initial build pass, prioritized in order: Football → Tennis → Basketball → Volleyball.

> [!NOTE]
> **Strict Epistemic & Regulatory Guardrails**: MatchIQ operates strictly as an analytical and simulated research platform. It never claims guaranteed outcomes, never confuses high model probability with positive expected value (+EV), never fabricates live odds or statistics, and never overwrites immutable pre-match predictions when models are retrained or updated.

---

## 1. Overview & Core Concept

- **What It Does**: MatchIQ ingests historical and upcoming sports data across Football, Tennis, Basketball, and Volleyball; trains and evaluates sport-specific statistical models using chronological (leakage-free) validation; strips bookmaker overround to compute true market-implied probabilities; identifies verifiable positive Expected Value (+EV) discrepancies; generates grounded AI tactical & contextual analyses via Google Gemini; and tracks immutable prediction records alongside a configurable paper-betting bankroll simulator.
- **Target Audience / Persona**: Quantitative sports analysts, data scientists, researchers, and disciplined sports observers who require transparent probability calibration (Brier score, log loss, reliability diagrams) rather than opaque "tipster" picks.
- **Key Value**: Unifies five distinct analytical layers that are normally conflated in consumer sports apps:
  1. **Statistical Model Probabilities** (sport-specific mathematical engines with chronological backtesting).
  2. **Market-Implied Probabilities** (raw decimal odds vs. vig-free normalized probabilities).
  3. **AI Contextual Explanations** (structured Gemini analysis grounded strictly in match data, explicitly flagging missing variables and invalidation risks).
  4. **Immutable Prediction Tracking** (timestamped pre-match predictions locked before kickoff/first serve).
  5. **Simulated Financial Performance** (paper-betting ledger with Flat, Kelly Criterion, and Percentage staking strategies, tracking ROI and max drawdown separately from statistical accuracy).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Multi-Sport Command Dashboard**:
   - Users land on a high-density quantitative workspace displaying KPI summary cards (Model Calibration Brier Score, Out-of-Sample Accuracy, Active +EV Opportunities, Simulated Bankroll ROI), interactive filters (Sport, Date Range, Competition, Prediction Market, Confidence Band), upcoming fixtures with side-by-side Model vs. Market probabilities, highest-confidence calibrated predictions, and recent settled match audits.
   - An explicit analytical banner distinguishes model confidence (certainty of outcome) from expected value (price edge over the bookmaker).
2. **Match Centre (Deep-Dive Inspection)**:
   - Clicking any match opens a sport-tailored analytical dossier showing participants, competition metadata, venue/surface conditions, data source provenance + sync timestamp, historical form, head-to-head splits, sport-specific radar/bar metrics (e.g., Football xG/xGA & shot creation; Tennis surface Elo, 1st/2nd serve & break points; Basketball Pace, Off/Def Rating & Four Factors; Volleyball set win %, sideout & attack efficiency), multi-bookmaker odds table with margin removal, model probability breakdown across markets, grounded AI Analysis panel, and immutable prediction audit log.
   - Users can lock a pre-match prediction or log a simulated paper bet directly from the Match Centre market row.
3. **Value Finder (+EV Scanner)**:
   - Analysts filter all upcoming markets by Sport, Competition, Market Type, Minimum Expected Value (`EV %`), Minimum Model Probability, and Model Reliability Tier.
   - Displays a sortable quantitative grid showing Selection, Bookmaker Decimal Odds, Raw Implied Probability, Fair (No-Vig) Market Probability, Calibrated Model Probability, Expected Value (`EV = (p_model × odds) - 1`), Model Version, and Data Freshness timestamp. Stale or unverified odds are automatically excluded.
4. **Statistical Engine & Performance Analytics**:
   - Interactive calibration curve (Predicted Probability Deciles vs. Observed Win Frequency), Brier Score & Log Loss comparisons across model architectures (e.g., Dixon-Coles vs. Poisson vs. Elo in Football; Surface Elo vs. Logistic Regression in Tennis), chronological train/test split inspector, and performance breakdowns by sport, competition, and market.
5. **Simulated Betting & Bankroll Ledger**:
   - Users manage virtual research bankrolls with configurable staking rules (Flat Stake, Fractional Kelly Criterion, Fixed Percentage), place hypothetical bets at verified market odds, settle completed matches, and inspect cumulative P&L equity curves, ROI %, win rate, closing-line value (CLV), and maximum drawdown.
6. **Data Providers, Sync Automation & CSV/JSON Import Studio**:
   - Users inspect provider adapter statuses, trigger idempotent manual synchronization jobs, view `data_sync_logs`, or upload custom CSV/JSON match & odds datasets with schema validation and duplicate prevention.

### Visual Identity & Theme (SaaS Quantitative Analytics)

- **Aesthetic Direction**: Institutional quantitative research terminal meets modern sports analytics workspace (inspired by Opta Analyst, ClubElo, and Bloomberg Terminal). Serious, data-dense, and free of gambling-site visual gimmicks.
- **Color Palette & 60-30-10 Distribution**:
  - **60% Dominant Neutral Canvas**: Crisp cool alabaster (`#F8FAFC`) in Light Mode; deep obsidian slate (`#0B0F17`) in Dark Mode.
  - **30% Structural Surfaces**: Pure white (`#FFFFFF`) / elevated dark slate (`#111827`) containers with hairline `1px` borders (`#E2E8F0` light / `#1E293B` dark) and single-elevation depth (no nested cards-within-cards or thick left borders).
  - **10% High-Intent & Semantic Accents**:
    - Primary Brand / Action: Cobalt Institutional Blue (`#2563EB` light / `#3B82F6` dark).
    - Positive Edge / Verified +EV / Settled Win: Emerald (`#16A34A` / `#22C55E`) always paired with explicit `+EV` or `Won` text labels.
    - Caution / Uncertainty / High Overround: Amber (`#D97706` / `#F59E0B`).
    - Negative EV / Settled Loss / Sync Error: Crimson (`#DC2626` / `#EF4444`).
- **Dual-Theme Architecture**: Full Light and Dark mode support wired via Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` with synchronized root surface/text pairs.
- **Typography & Tabular Discipline**:
  - **Display & Navigation (`Plus Jakarta Sans`)**: Crisp geometric hierarchy for headers, match titles, and section anchors.
  - **Body & Analytical Prose (`Public Sans`)**: High-legibility sans-serif for AI tactical explanations, methodology notes, and filter controls.
  - **Quantitative Data & Odds (`JetBrains Mono` + `tabular-nums`)**: Strictly applied to all probabilities, decimal odds, Expected Value percentages, Brier scores, Elo ratings, timestamps, and bankroll figures so decimal points align vertically across every table.
- **Zero-Pill & Anti-Slop Discipline**:
  - Static metadata (sport name, competition, surface, timestamps, model version) renders as clean unboxed text separated by middle dots (`·`) or slashes (`/`).
  - Interactive filter bars (Sport selector, Market tabs, Staking mode switcher) use tactile segmented `<button>` controls with active states.
  - Zero decorative pulsing dots, zero fake telemetry tickers, and zero code-comment headers (`//`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Unified TypeScript Statistical Engine + Modular Provider Architecture
- **Chosen Approach**: Implement the sport-specific statistical models (Elo, Surface-Adjusted Elo, Poisson, Dixon-Coles, Logistic Regression, Four-Factors & Set-Level Markov/Distribution calculators, Brier/Log-Loss evaluators, and Overround/EV normalizers) in a strongly typed, unit-tested TypeScript statistical engine (`src/engine/`) exposed via Express REST API endpoints and backed by Cloud SQL PostgreSQL.
- **Why**: In the AI Studio Cloud Run runtime, running a unified Node/Express + TypeScript service on port 3000 eliminates cross-container network latency and process-orchestration fragility while executing matrix/probability calculations (Poisson/Dixon-Coles grids, Elo updates, logistic inference, and calibration binning) in under 5ms per match. We also preserve a clean REST service boundary (`/api/engine/*`) so an external Python microservice (`scikit-learn`/`XGBoost`) can be plugged in via `PYTHON_ENGINE_URL` without changing a single line of frontend or database code.
- **Alternatives Considered**: Spawning a separate background Python FastAPI process inside the same web container—rejected for the default runtime because dual-runtime process supervision in serverless containers increases cold-start failure risk, though we document and support the REST contract for external Python worker deployment.

### Decision 2: Data Provider Evaluation & Adapter Strategy
We evaluated the candidate sports data providers across all four target sports:

| Provider / Source | Sports Covered | Free Tier & Limits | Historical & Fixture Coverage | Detailed Stats & Odds | Role in MatchIQ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Football-data.org** | Football | Free tier: 10 req/min, 12 major European & international competitions | Upcoming fixtures, results, standings, basic match stats | Basic 1X2 odds in historical CSVs; no live multi-bookie deep markets on free tier | Primary live adapter for Football fixtures & standings |
| **TheSportsDB** | Football, Tennis, Basketball, Volleyball | Free public key (`3`): 30 req/min | Upcoming events, past results, league metadata, venue details | Basic event stats; limited live bookmaker odds on free tier | Universal multi-sport fixture & result discovery adapter |
| **API-SPORTS** | Football, Basketball, Volleyball, Tennis | Free tier: 100 req/day per sport (strictly rate-limited) | Deep fixtures, injuries, lineups, quarter/set scores | Pre-match odds endpoint available (requires API key) | Optional live adapter when API key is configured; cached carefully |
| **Open Historical Datasets (Jeff Sackmann ATP/WTA, Football-Data.co.uk, NBA/FIVB Archives)** | Football, Tennis, Basketball, Volleyball | 100% Free & Open | Multi-year chronological match results, surface/serve stats, closing bookmaker odds | High-precision historical stats & closing decimal odds | Baseline chronological training, calibration validation & verified seed dataset |
| **MatchIQ CSV/JSON Import Adapter** | All 4 Sports | Unlimited local/upload | User-supplied fixture, stat, and bookmaker odds files | Full custom market & stat mapping | Guaranteed offline/custom extensibility without code changes |

### Decision 3: AI Abstraction Layer (`LLMProvider` Interface)
- **Chosen Approach**: Build a server-side `AIAnalysisService` interface with a production `GeminiAnalysisProvider` (`@google/genai` using `gemini-3.8-flash` and structured `responseSchema`) that accepts only verified match statistics, head-to-head records, and model probabilities.
- **Why**: Guarantees that the AI never invents statistics, explicitly lists `missingDataWarnings` and `invalidationFactors`, stores every generated explanation in the `ai_analyses` table with model provenance, and allows swapping or adding alternative LLM providers in the future.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT WORKSPACE (React 19 + Tailwind v4 + Recharts)              │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Top Bar: MatchIQ Brand Wordmark  —  5 View Nav Links  —  Primary Sync / Import CTA │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│        │                 │                  │                   │                │       │
│        ▼                 ▼                  ▼                   ▼                ▼       │
│  ┌───────────┐    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │ Dashboard │    │ Match Centre │   │ Value Finder │   │ Performance  │  │ Simulated │  │
│  │ & Filters │    │ (4 Sports +  │   │ (+EV Scanner │   │ & Calibration│  │ Betting & │  │
│  │           │    │ AI & Odds)   │   │ & No-Vig)    │   │ Lab (Charts) │  │ Data Sync │  │
│  └─────┬─────┘    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  └─────┬─────┘  │
└────────┼─────────────────┼──────────────────┼──────────────────┼────────────────┼────────┘
         │                 │                  │                  │                │
         ▼                 ▼                  ▼                  ▼                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER & REST API LAYER (server.ts)                      │
│  • Firebase Auth Verification Middleware (requireAuth / User Isolation)                  │
│  • Input Validation, Rate Limiting, Idempotent Sync Orchestrator                         │
│  • Routes: /api/matches, /api/predictions, /api/odds/value, /api/ai/analyze,             │
│            /api/simulation, /api/analytics, /api/sync, /api/import                       │
└────────┬──────────────────────────────┬─────────────────────────────────┬────────────────┘
         │                              │                                 │
         ▼                              ▼                                 ▼
┌─────────────────────────┐  ┌─────────────────────────────────┐  ┌────────────────────────┐
│ SPORT PREDICTION ENGINE │  │   AI ANALYSIS ABSTRACTION       │  │ PROVIDER ADAPTERS      │
│ • Football: Dixon-Coles │  │ • LLMProvider Interface         │  │ • FootballDataAdapter  │
│   Poisson, xG Elo       │  │ • Gemini 3.8 Flash (@google/    │  │ • TheSportsDBAdapter   │
│ • Tennis: Surface Elo,  │  │   genai Server-Side SDK)        │  │ • HistoricalSeedAdapter│
│   Serve/Hold Logistic   │  │ • Structured JSON Schema:       │  │ • CSV/JSON Importer    │
│ • Basketball: Pace +    │  │   form, strengths, uncertainties│  │ • Idempotent Dedupe    │
│   Off/Def Rating + Elo  │  │   missingDataWarnings,          │  └───────────┬────────────┘
│ • Volleyball: Set-Level │  │   invalidationFactors           │              │
│   Markov + Sideout Elo  │  └────────────────┬────────────────┘              │
│ • Calibration & EV Math │                   │                               │
└────────────┬────────────┘                   │                               │
             └────────────────────────────────┼───────────────────────────────┘
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                 CLOUD SQL POSTGRESQL DATABASE (Drizzle ORM + Connection Pool)            │
│  Core Entities: sports, competitions, venues, teams, players, matches, match_statistics, │
│  team_statistics, player_statistics, head_to_head_records, odds_providers,               │
│  bookmaker_odds, prediction_markets, model_versions, model_evaluations, predictions,     │
│  prediction_results, ai_analyses, simulated_bankrolls, simulated_bets, users,            │
│  user_preferences, data_sources, data_sync_logs                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Normalized PostgreSQL Database Schema (24 Tables)

All tables include `created_at` and `updated_at` timestamps, foreign key constraints, and targeted composite indexes for fast analytical filtering:

1. **Identity & Preferences (User-Isolated)**:
   - `users`: `id` (PK), `uid` (Firebase Auth UID, unique), `email`, `display_name`, `role`, `created_at`, `updated_at`.
   - `user_preferences`: `id` (PK), `user_id` (FK -> `users.id`), `default_sport`, `min_ev_threshold` (default `0.03`), `min_model_reliability`, `default_staking_strategy`, `theme`, `updated_at`.
2. **Sports Catalog & Reference Entities**:
   - `sports`: `id` (PK), `slug` (`football`, `tennis`, `basketball`, `volleyball`), `name`, `scoring_type`, `is_active`.
   - `competitions`: `id` (PK), `sport_id` (FK), `external_id`, `name`, `country_or_tour`, `category_tier` (e.g., `Grand Slam`, `ATP 1000`, `Premier League`, `EuroLeague`, `VNL`), `surface_or_environment` (`Hard`, `Clay`, `Grass`, `Indoor`, `Outdoor`), `season`.
   - `venues`: `id` (PK), `name`, `city`, `country`, `surface`, `is_indoor`, `altitude_meters`.
   - `teams`: `id` (PK), `sport_id` (FK), `name`, `short_code`, `country`, `elo_rating`, `offensive_rating`, `defensive_rating`, `pace_rating`.
   - `players`: `id` (PK), `sport_id` (FK), `team_id` (nullable FK), `full_name`, `country`, `current_ranking`, `elo_overall`, `elo_hard`, `elo_clay`, `elo_grass`, `handedness`.
3. **Matches & Granular Sport Statistics**:
   - `matches`: `id` (PK), `sport_id` (FK), `competition_id` (FK), `venue_id` (FK), `home_team_id` (nullable FK), `away_team_id` (nullable FK), `home_player_id` (nullable FK), `away_player_id` (nullable FK), `scheduled_at`, `status` (`scheduled`, `live`, `completed`, `postponed`), `home_score`, `away_score`, `period_scores_json` (half/quarter/set breakdown), `source_id` (FK -> `data_sources.id`), `external_match_id` (unique per source), `last_synced_at`.
   - `match_statistics`: `id` (PK), `match_id` (FK), `side` (`home` / `away`), `metrics_json` (stores sport-specific verified metrics: Football `xg`, `xga`, `shots`, `shots_on_target`, `possession`, `big_chances`, `corners`, `cards`, `rest_days`; Tennis `first_serve_pct`, `first_serve_won_pct`, `second_serve_won_pct`, `bp_saved_pct`, `bp_converted_pct`, `fatigue_index`; Basketball `off_rating`, `def_rating`, `pace`, `efg_pct`, `rebound_pct`, `tov_pct`, `rest_days`; Volleyball `set_win_pct`, `attack_eff`, `reception_pos_pct`, `block_pts_per_set`, `serve_aces_per_set`).
   - `team_statistics`: `id` (PK), `team_id` (FK), `competition_id` (FK), `season`, `matches_played`, `wins`, `draws`, `losses`, `Home/Away splits`, `form_last_5`, `metrics_summary_json`.
   - `player_statistics`: `id` (PK), `player_id` (FK), `surface` (`all`, `hard`, `clay`, `grass`, `indoor`), `season`, `matches_played`, `wins`, `losses`, `hold_pct`, `break_pct`, `fatigue_workload_7d`, `metrics_summary_json`.
   - `head_to_head_records`: `id` (PK), `sport_id` (FK), `participant_a_id`, `participant_b_id`, `total_matches`, `a_wins`, `b_wins`, `draws`, `surface_or_venue_splits_json`, `last_meeting_date`.
4. **Bookmaker Odds & Market Definitions**:
   - `prediction_markets`: `id` (PK), `sport_id` (FK), `market_key` (e.g., `1x2`, `over_under_goals`, `btts`, `asian_handicap`, `draw_no_bet`, `match_winner`, `set_winner`, `total_games_ou`, `win_at_least_one_set`, `point_spread`, `total_points_ou`, `total_sets_ou`), `name`, `outcomes_schema_json`.
   - `odds_providers`: `id` (PK), `name` (e.g., `Pinnacle`, `Bet365`, `Betfair Exchange`, `Unibet`), `slug`, `margin_profile`.
   - `bookmaker_odds`: `id` (PK), `match_id` (FK), `market_id` (FK), `provider_id` (FK), `selection` (`home`, `draw`, `away`, `over`, `under`, `yes`, `no`), `line` (nullable numeric, e.g., `2.5`, `-4.5`, `22.5`), `decimal_odds`, `raw_implied_prob`, `fair_no_vig_prob`, `overround_pct`, `is_closing_line`, `captured_at` (append-only historical preservation).
5. **Statistical Models, Immutable Predictions & AI Analysis**:
   - `model_versions`: `id` (PK), `sport_id` (FK), `name`, `algorithm_family` (`dixon_coles`, `poisson_xg`, `surface_elo_logistic`, `four_factors_gbm`, `set_markov_elo`), `version_tag` (e.g., `v2.4.0-football`), `hyperparameters_json`, `training_window_start`, `training_window_end`, `reliability_score`, `is_active`.
   - `model_evaluations`: `id` (PK), `model_version_id` (FK), `sport_id` (FK), `competition_id` (nullable FK), `market_id` (FK), `sample_size`, `accuracy`, `precision_score`, `recall_score`, `brier_score`, `log_loss`, `ece_calibration_error`, `calibration_bins_json`, `evaluated_at`.
   - `predictions` (**Immutable Pre-Match Ledger**): `id` (PK), `match_id` (FK), `sport_id` (FK), `market_id` (FK), `model_version_id` (FK), `predicted_selection`, `line`, `model_probability`, `market_fair_probability_at_pred`, `best_decimal_odds_at_pred`, `expected_value`, `confidence_tier` (`high`, `calibrated`, `low_sample`), `data_timestamp`, `predicted_at`, `status` (`pending`, `won`, `lost`, `push`, `void`).
   - `prediction_results`: `id` (PK), `prediction_id` (FK, unique), `actual_outcome`, `actual_numeric_value`, `brier_contribution`, `log_loss_contribution`, `clv_edge`, `settled_at`.
   - `ai_analyses`: `id` (PK), `match_id` (FK), `model_version_id` (FK), `llm_provider` (`google-gemini`), `llm_model` (`gemini-3.8-flash`), `recent_form_summary`, `strengths_weaknesses_json`, `historical_patterns`, `contextual_factors`, `uncertainties_and_risks`, `invalidation_factors_json`, `missing_data_warnings_json`, `data_snapshot_timestamp`, `generated_at`.
6. **Simulated Paper-Betting & Provenance**:
   - `simulated_bankrolls`: `id` (PK), `user_id` (FK -> `users.id`), `name`, `initial_capital`, `current_balance`, `peak_balance`, `max_drawdown_pct`, `staking_strategy` (`flat`, `kelly_fractional`, `percentage`), `stake_param` (e.g., `100` unit or `0.25` Kelly fraction), `currency`.
   - `simulated_bets`: `id` (PK), `bankroll_id` (FK), `user_id` (FK), `match_id` (FK), `prediction_id` (nullable FK), `market_id` (FK), `selection`, `line`, `stake_amount`, `decimal_odds`, `closing_decimal_odds`, `model_prob_at_bet`, `expected_value_at_bet`, `potential_payout`, `status` (`open`, `won`, `lost`, `push`), `profit_loss`, `placed_at`, `settled_at`.
   - `data_sources`: `id` (PK), `name`, `adapter_key`, `base_url`, `rate_limit_per_min`, `last_status`, `last_checked_at`.
   - `data_sync_logs`: `id` (PK), `source_id` (FK), `sport_id` (nullable FK), `sync_type` (`fixtures`, `results`, `odds`, `csv_import`, `predictions`), `records_processed`, `records_inserted`, `records_skipped_duplicate`, `status` (`success`, `partial`, `failed`), `error_message`, `started_at`, `completed_at`.

### Sport-Specific Statistical Modelling Strategy

Each sport uses an independent statistical pipeline in `src/engine/` validated with **chronological walk-forward splits** (never random shuffling):

1. **Football (Soccer) Engine (`src/engine/football.ts`)**:
   - **Models**:
     - *Dixon-Coles Bivariate Poisson Model*: Estimates team attack ($\alpha_i$) and defense ($\beta_j$) parameters with home advantage ($\gamma$) and low-score dependence parameter ($\rho$) adjusting `0-0`, `1-0`, `0-1`, and `1-1` scorecells, weighted by time-decay ($\xi$) and blended with rolling Expected Goals ($xG / xGA$).
     - *Football Elo + Logistic Ensemble*: Rating delta adjusted for rest days, key injuries, and home advantage.
   - **Supported Markets Derived from Full Score Matrix ($0..8 \times 0..8$ goals)**: Match Winner (1X2), Double Chance (1X, X2, 12), Draw No Bet, Over/Under Goals (1.5, 2.5, 3.5), Both Teams To Score (BTTS Yes/No), Correct Score, Asian Handicap (-1.5, -0.5, +0.5, +1.5), First-Half 1X2 & O/U 0.5/1.5, and Team Total Goals.
2. **Tennis Engine (`src/engine/tennis.ts`)**:
   - **Models**:
     - *Surface-Blended Elo (`Elo_Overall` + `Elo_Surface`)*: Combines overall tour Elo with surface-specific Elo (`Hard`, `Clay`, `Grass`, `Indoor`) and tournament category weighting.
     - *Serve/Return Markov & Logistic Model*: Uses 1st-serve %, 1st/2nd serve points won, break points saved/converted, and 7-day workload fatigue index to estimate service hold probability ($p_A, p_B$) and propagate point -> game -> set -> match probabilities (supporting Best-of-3 and Best-of-5 formats).
   - **Supported Markets**: Match Winner, Set Betting / Set Winner, Total Games Over/Under (e.g., 21.5, 22.5, 38.5), Player to Win At Least One Set, and Game Handicap (e.g., -3.5 / +3.5).
3. **Basketball Engine (`src/engine/basketball.ts`)**:
   - **Models**:
     - *Pace-Adjusted Offensive/Defensive Rating & Four Factors Model*: Projects expected possessions ($\text{Pace}_{\text{proj}}$) and points per 100 possessions using Effective FG%, Turnover %, Offensive Rebound %, Free Throw Rate, rest days, and home-court advantage.
     - *Normal / Poisson Point Distribution & Elo*: Models expected margin ($\mu_{\text{spread}}, \sigma_{\text{spread}}$) and expected total ($\mu_{\text{total}}, \sigma_{\text{total}}$) to compute exact cumulative probabilities for any spread or total line.
   - **Supported Markets**: Match Winner (Moneyline), Point Spread (e.g., -5.5 / +5.5), Total Match Points Over/Under (e.g., 218.5, 164.5), Team Total Points, and First-Quarter / First-Half Winner & Totals.
4. **Volleyball Engine (`src/engine/volleyball.ts`)**:
   - **Models**:
     - *Set-Level Markov Chain & Sideout/Attack Efficiency Model*: Estimates single-set win probability ($p_{\text{set}}$ for sets 1–4 to 25 pts, and $p_{\text{set5}}$ for tiebreak to 15 pts) from team Elo, attack kill %, positive reception %, block rate, and home advantage.
     - Propagates exact binomial/combinatorial probabilities for `3-0`, `3-1`, `3-2`, `2-3`, `1-3`, and `0-3` set outcomes.
   - **Supported Markets**: Match Winner, Set Handicap (-1.5 / +1.5 sets), Total Sets Over/Under (3.5, 4.5), Exact Set Score / First Set Winner, and Total Match Points Over/Under (e.g., 180.5).

### Odds Normalization & Expected Value Math (`src/engine/odds.ts`)

- **Raw Implied Probability**: $q_i = \frac{1}{O_i}$ for decimal odds $O_i > 1$.
- **Bookmaker Overround (Margin)**: $M = \left(\sum_{i=1}^{k} q_i\right) - 1$.
- **Fair Market Probability (Proportional & Power Vig Removal)**: $p_i^{\text{market}} = \frac{q_i}{\sum_{j=1}^{k} q_j}$.
- **Expected Value**: $\text{EV}_i = (p_i^{\text{model}} \times O_i) - 1$.
- **Value Qualification Gate**: A selection is flagged as a candidate value opportunity only when:
  1. Odds are verified and captured within the freshness window.
  2. Model reliability score $\ge$ threshold (default `0.75`, based on historical calibration sample size and Brier score).
  3. $\text{EV}_i \ge$ user-configurable threshold (default `+3.0%`).

### Interactive Component & State Mapping

| View / Component | User Interaction | API / State Handler | Visible Outcome |
| :--- | :--- | :--- | :--- |
| **Dashboard Filter Bar** | Filter by Sport, Date, Competition, Market, Confidence Range | Updates query state -> filters `/api/dashboard` & match cards | Match grid, KPI cards, and market tables update instantaneously with zero page reload |
| **Match Centre Inspector** | Select match -> switch Market tabs / request AI Analysis / Lock Prediction | `GET /api/matches/:id`, `POST /api/ai/analyze/:matchId`, `POST /api/predictions/lock` | Displays sport-specific stat radar/bars, no-vig odds comparison, structured Gemini breakdown, and appends locked prediction to immutable audit log |
| **Value Finder Scanner** | Adjust Min EV %, Min Model Prob, Min Reliability, Sport, Market | `GET /api/odds/value` with live slider/dropdown thresholds | Renders filtered +EV table sorted by EV %, showing exact margin removed and reliability warning banners |
| **Simulated Betting Slip & Ledger** | Select Bankroll -> choose Flat / Fractional Kelly / % Stake -> Place Paper Bet -> Settle Completed Bet | `POST /api/simulation/bets`, `POST /api/simulation/settle` | Updates bankroll balance, recalculates ROI %, Win %, and Max Drawdown, and appends point to P&L equity chart |
| **Performance & Calibration Lab** | Switch Sport, Model Version, or Market; run Chronological Backtest | `GET /api/analytics/performance`, `POST /api/engine/evaluate` | Updates calibration curve (predicted vs. actual frequency), Brier score, Log Loss, and model comparison table |
| **Data Sync & CSV/JSON Import** | Click "Run Sync" or upload/paste CSV/JSON fixtures & odds | `POST /api/sync/run`, `POST /api/import/dataset` | Runs idempotent ingestion, prevents duplicates, logs row counts in `data_sync_logs`, and refreshes matches |

---

## 5. Development Milestones, Cost Estimate & Testing Strategy

### Milestone Execution Plan
Upon your approval of this architecture, we will execute the build in a structured sequence:
1. **Step 1 — Cloud SQL & Firebase Auth Provisioning**: Check Cloud SQL eligibility, trigger the AI Studio Cloud SQL consent flow, provision the PostgreSQL instance and Firebase Auth OAuth configuration, and push the 24-table Drizzle schema (`src/db/schema.ts`).
2. **Step 2 — Statistical Engines, Odds Normalizer & Unit Test Suite**: Implement the pure TypeScript mathematical engines (`football.ts`, `tennis.ts`, `basketball.ts`, `volleyball.ts`, `odds.ts`, `calibration.ts`) and verify all formulas with `node:test` unit tests (Poisson/Dixon-Coles sums to 1.0, overround removal, EV calculation, Brier/Log-Loss math, chronological split leakage prevention).
3. **Step 3 — Provider Adapters, Verified Multi-Sport Seed & Gemini AI Service**: Build the provider adapters, seed realistic historical & upcoming matches across Football, Tennis, Basketball, and Volleyball with complete statistics, historical evaluations, and verified multi-bookmaker odds, and wire the server-side `@google/genai` (`gemini-3.8-flash`) structured analysis endpoint.
4. **Step 4 — Full-Stack Frontend Workspace**: Build the complete responsive UI (Dashboard, Match Centre, Value Finder, Prediction Tracker, Simulated Betting Studio, Performance & Calibration Lab, and Data Sync / CSV Import Modal) with Light/Dark theme support.
5. **Step 5 — End-to-End Verification**: Run unit tests, compile check, and real headless browser verification across desktop and mobile viewports.

### Estimated Infrastructure Costs
- **Database (Cloud SQL Developer Edition / Supabase Free Tier)**: **$0 / month** (scale-to-zero free tier in AI Studio).
- **Web & Statistical Runtime (AI Studio Cloud Run / Vercel)**: **$0 / month** within standard preview/hobby tiers.
- **Sports Data Providers**: **$0 / month** using Football-data.org free tier, TheSportsDB public endpoint, verified open historical datasets, and CSV/JSON imports.
- **AI Analysis (Google Gemini `gemini-3.8-flash`)**: **$0 – $2 / month** with server-side caching in `ai_analyses` so each match is analyzed on demand rather than redundantly queried.
- **Total Initial Operating Cost**: **$0 / month**.
