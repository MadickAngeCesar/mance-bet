# MatchIQ Firestore Security Specification (Phase 0 Security TDD)

## 1. Data Invariants

1. **Authentication & Email Verification**: All writes (`create`, `update`, `delete`) require an authenticated user (`request.auth != null`) with a verified email address (`request.auth.token.email_verified == true`).
2. **PII Isolation**: User email addresses are strictly isolated inside `/users/{userId}/private/{docId}` and never stored in `/users/{userId}`. Only the owner (`request.auth.uid == userId`) can read or write their profile and private PII documents.
3. **Immutable Pre-Match Predictions (`/locked_predictions/{predictionId}`)**:
   - Once created, a locked prediction is strictly immutable (`allow update, delete: if false;`) so historical model evaluation can never be retroactively tampered with.
   - `userId` must equal `request.auth.uid`, and `createdAt` must equal `request.time`.
4. **Simulated Bets (`/simulated_bets/{betId}`)**:
   - Users can only read, list, create, or settle their own simulated bets (`resource.data.userId == request.auth.uid`).
   - Terminal State Lock: Once a simulated bet transitions from `'open'` to `'won'`, `'lost'`, or `'push'`, no further updates are permitted (`existing().status == 'open'`).
   - Action-Based Update: Settling a bet may only modify `['status', 'profitLoss', 'updatedAt']` while keeping `userId`, `matchId`, `stake`, `decimalOdds`, and `createdAt` unchanged.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on UserProfile**: `{ uid: 'u1', displayName: 'Analyst', ..., isAdmin: true }` -> Rejected by `hasOnly()`.
2. **Unverified Email Spoof**: Write attempt where `request.auth.token.email_verified == false` -> Rejected by `isVerifiedUser()`.
3. **Cross-User PII Read**: User `u2` attempting `get(/users/u1/private/info)` -> Rejected by `isOwner(userId)`.
4. **Blanket List Query Scraping**: Client executing `list(/simulated_bets)` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid`.
5. **Retroactive Prediction Tampering**: User attempting `update` on `/locked_predictions/p1` after match finishes -> Rejected by `allow update: if false`.
6. **Terminal State Bypass on Settled Bet**: Updating a simulated bet whose `existing().status == 'won'` -> Rejected by `existing().status == 'open'` gate.
7. **Stake Tampering During Settlement**: Updating `stake` alongside `status` when settling a bet -> Rejected by `affectedKeys().hasOnly(['status', 'profitLoss', 'updatedAt'])`.
8. **Identity Spoofing on Create**: Creating a simulated bet with `userId: 'other-user'` -> Rejected by `data.userId == request.auth.uid`.
9. **Timestamp Forgery**: Creating a prediction with a past `createdAt` timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
10. **ID Poisoning (2KB Document ID)**: Creating a document with a 2,000-character ID or special characters -> Rejected by `isValidId(id)`.
11. **Value Poisoning on Whitelisted Key**: Updating `status` on `/simulated_bets` to a 10KB string or number -> Rejected because `isValidSimulatedBet(incoming())` wraps the entire `allow update` block.
12. **Negative or Out-of-Bounds Probability/Odds**: Creating a prediction with `modelProbability: 1.5` or `decimalOdds: 0.5` -> Rejected by numeric range guards (`modelProbability > 0 && modelProbability < 1 && decimalOdds > 1.0`).
