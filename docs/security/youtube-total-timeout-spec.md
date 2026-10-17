# Proposed optional total deadline for YouTube API calls

Status: **Specification only — not implemented or validated in production.**
Scope: `src/video-intelligence/youtube-api.cjs` on `agent/youtube-client-hardening` (PR #5).

## Baseline and motivation

Current implementation provides per-attempt `timeoutMs`, 0–5 retries, and up to 30 seconds of `Retry-After` delay per wait. With six attempts and five capped waits, configured timing may add up to approximately `6 * timeoutMs + 150000 ms` plus scheduler/processing overhead. The implementation does **not** offer a hard, end-to-end wall-clock deadline. This is not by itself a demonstrated security vulnerability.

## Decision: opt-in deadline

Propose `totalTimeoutMs` as an optional positive finite millisecond value, default **undefined** (no behavior change). Reject zero, negative, non-finite or non-number values. Do not change the existing `timeoutMs` semantics or default. Do not impose an undisclosed minimum/maximum; choose a documented operating policy before implementation. This is a proposal, not an API that currently exists.

The budget begins at entry to `getVideos` after synchronous input validation. It covers every HTTP request, response JSON read, retry/backoff sleep and post-response processing until settlement. It must be independent for simultaneous calls. Use a monotonic clock for elapsed time; no shared mutable timeout state.

## Required semantics

- If the caller's `AbortSignal` is already aborted, return `ABORTED` before any network request, even with an elapsed deadline.
- Caller cancellation during operation returns `ABORTED`; deadline expiry returns a stable public `TOTAL_TIMEOUT` error distinct from per-attempt `TIMEOUT`. When both fire in the same event-loop turn, define and test deterministic precedence (recommend caller cancellation wins).
- Never begin a retry when the remaining budget is zero. Cap each HTTP attempt to `min(timeoutMs, remainingBudget)`; cap each retry wait to the remaining budget, with expiry returning `TOTAL_TIMEOUT`, not pretending the originally requested `Retry-After` completed.
- Ensure deadline expiry rejects even if an injected fetch or sleep ignores its abort signal. Abort in-flight fetches where possible, release listeners/timers in `finally`, and avoid unhandled rejections.
- Preserve bounded retries, quota handling, redirect blocking, sanitized errors and isolation of the API key.
- Explicitly document that JavaScript cannot preempt synchronous CPU work; an exact hard real-time deadline is not guaranteed under event-loop starvation.

## Acceptance tests (offline; deterministic clocks when feasible)

1. Backward compatibility: no `totalTimeoutMs` retains all 25 existing tests.
2. Invalid configuration values reject before fetch.
3. Budget expiry with never-settling fetch and never-settling JSON read.
4. Budget expiry during a never-settling or long `Retry-After` sleep, without subsequent request.
5. Per-attempt timeout expires before a generous total budget => `TIMEOUT` and existing retry policy.
6. Total budget expires before per-attempt timeout => `TOTAL_TIMEOUT`.
7. Pre-aborted and concurrently aborted callers => `ABORTED`; unrelated concurrent calls remain unaffected.
8. Late settlements do not change result or leak listeners/unhandled rejections.
9. Poisoned transport errors and fake credential sentinels never appear in returned messages or logs.
10. CI: deterministic client tests, mutation audit, Gitleaks, MV3, and (separately) live API validation on final SHA.

## Implementation gate

Do not change production code until the deadline's precedence, clock strategy, cancellation cleanup, max accepted value and test harness are reviewed. Add failing acceptance tests first; distinguish expected red tests from regressions. A green simulated CI alone does not establish live correctness. Do not merge or release without separate independent review.
