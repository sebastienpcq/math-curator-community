# TEST RESULTS — cycle 60 consolidation

## Last verified checkpoint

Commit: `a856e75c6547b2b7bdd6b26112e0d7f10817551d` (cycle 59).

- Knowledge Curator checks: **SUCCESS**, run 38670136663.
- Knowledge Curator browser integration: **SUCCESS**, run 38670136562.

Both statuses were checked directly in GitHub Actions. They do not validate subsequent commits.

## What the suite covers

- Node tests for attempts, progress, review planning, storage recovery and migration prototypes.
- Playwright checks for V1/V2 import, export, reset, error tracking, journal recovery and failure injection.
- Chromium persistent-profile restart test for experimental IndexedDB.
- Concurrency scenarios for IndexedDB, including two active tabs.

Passing tests establish the behaviors in the tested scenarios, not universal atomicity or full production readiness.

## Open validation gaps

1. `localStorage` writes from uncooperative or older tabs remain uncoordinated with IndexedDB.
2. Real browser storage quota exhaustion and browser-initiated data eviction are not reproduced by callback-thrown errors.
3. The experimental IndexedDB module is not integrated as the application's authoritative storage.
4. Rollback after new writes to IndexedDB has no proven reverse migration and reconciliation protocol.
5. End-to-end tests in an actual Chrome extension context (rather than the local web prototype) remain to be established.
6. Browser restart durability was tested in a persistent Chromium profile, not across all platforms and browsers.

## Release decision

**NO-GO for IndexedDB activation.** Keep the V0.5 storage behavior and experimental module separate. Do not merge or publish without an explicit decision and final CI verification.

## Cycle 73 — Measured MV3 DOM scans

Verified on commit `e631a79cf4da198c0d6b7031fdb59d6c6e57f62c`:

- General checks run 38673091939: **SUCCESS**.
- Browser integration run 38673091936: **SUCCESS**.
- MV3 smoke tests: **9 passed**.
- Knowledge Curator browser tests: **48 passed**.
- Instrumented 100-card fixture: **2 scans**, **2.2 ms cumulative**, **2.1 ms maximum** (Chromium CI, one sample; rounded).

These timings are a single CI sample, not a statistically reliable benchmark or a cross-device performance guarantee. No additional optimization is justified solely by this observation. Repeat measurements under varied load before claiming improvement.

## Cycle 75 — Three-scale MV3 benchmark

Verified on cycle-74 commit `f9d8e516057baa25c94a965c4653bb11620055e1`:

- General checks run 38673457258: **SUCCESS**.
- Chromium integration run 38673457256: **SUCCESS**.
- MV3 tests: **10 passed**; learning prototype browser tests: **48 passed**.
- Cumulative feed at 100 cards: 1 scan, 6.2 ms.
- Cumulative feed at 500 cards: 1 scan, 7.8 ms.
- Cumulative feed at 1,000 cards: 1 scan, 9.4 ms.

Measurements were taken from the GitHub Actions log of one Chromium CI run. Each duration is the additional scan duration at that cumulative feed size, not total wall-clock loading time. They are not enough to infer asymptotic complexity or device-independent performance.

## Cycle 75 — Three-scale MV3 benchmark (verified)

Commit `f9d8e516057baa25c94a965c4653bb11620055e1`:
- General checks run 38673457258: **SUCCESS**.
- Browser integration run 38673457256: **SUCCESS**.
- MV3 suite: **10 passed**; prototype browser suite: **48 passed**.
- Cumulative card fixture, per-stage delta: 100 cards — 1 scan, 6.2 ms; 500 cards — 1 scan, 7.8 ms; 1,000 cards — 1 scan, 9.4 ms.

The per-stage figures measure incremental additions to a growing DOM, not independent full-page baselines. One run only; no confidence interval or device-level performance guarantee. No engine optimization justified on this evidence alone.
