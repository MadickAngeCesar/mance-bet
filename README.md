# MatchIQ — AI-Powered Multi-Sport Quantitative Analytics & Prediction Platform

MatchIQ is an institutional multi-sport analytics, probability estimation, bookmaker odds evaluation, and simulated paper-betting platform supporting **Football (Soccer)**, **Tennis**, **Basketball**, and **Volleyball**.

## Core Architectural Principles

1. **Five Distinct Epistemic Layers**:
   - **Statistical Model Probabilities**: Sport-specific mathematical models (`src/engine/sportsModels.ts`).
   - **Market-Implied Probabilities**: Decimal odds conversion (`1 / Odds`) and proportional overround/margin removal (`src/engine/odds.ts`).
   - **AI Contextual Analysis**: Grounded Google Gemini (`gemini-3.8-flash`) tactical and statistical synthesis (`server.ts`) with explicit missing-data disclosures and invalidation triggers.
   - **Immutable Pre-Match Prediction Tracking**: Timestamped predictions saved before kickoff/first serve and never overwritten upon model updates.
   - **Simulated Paper-Betting Ledger**: Virtual bankroll simulation supporting Fractional Kelly Criterion, Flat Unit, and Percentage staking (`src/engine/odds.ts`).

2. **Supported Sports & Statistical Models**:
   - **Football (`predictFootballMatch`)**: Dixon-Coles Bivariate Poisson with low-score $\rho$ dependence adjustment, rolling $xG / xGA$ integration, and Club Elo ratings.
   - **Tennis (`predictTennisMatch`)**: Surface-Blended Elo (`Hard`, `Clay`, `Grass`, `Indoor`) + Serve/Hold Markov chain propagation and 14-day fatigue workload adjustment.
   - **Basketball (`predictBasketballMatch`)**: Pace-Adjusted Offensive/Defensive Ratings, Dean Oliver Four Factors (`eFG%`, `TOV%`, `ORB%`, `FTR`), rest days, and cumulative normal spread/total distributions.
   - **Volleyball (`predictVolleyballMatch`)**: Set-Level Combinatorial Markov chain + Sideout & Attack efficiency model across Best-of-5 set outcomes (`3-0`, `3-1`, `3-2`, `2-3`, `1-3`, `0-3`).

## Installation & Execution Commands

```bash
# Install dependencies
npm install

# Run statistical engine unit tests
npx --yes tsx --test src/engine/engine.test.ts

# Audit Firestore security rules
npx eslint firestore.rules

# Start full-stack Express + Vite server on port 3000
npm run dev

# Type-check & build for production
npm run lint
npm run build
```
