# MV3 settings and favorites — persistence guarantees and residual risks

## Scope

- Pull request: [#7](https://github.com/seblenonsaint/math-curator-community/pull/7), draft, base `agent/youtube-client-hardening`
- Issue: [#6](https://github.com/seblenonsaint/math-curator-community/issues/6)
- Validated code SHA: `1868bb081ccd29a1bfd1c14111cd0b37b6a17355`
- This report documents observed behavior; it does not claim transactional durability under abrupt worker termination.

## Verified evidence

- [Chromium MV3 integration #14](https://github.com/seblenonsaint/math-curator-community/actions/runs/39008540850): success; 20 Playwright tests passed.
- In the same workflow: four deterministic Node.js storage-failure tests passed, plus seven community Node.js baseline tests.
- [Knowledge Curator checks #554](https://github.com/seblenonsaint/math-curator-community/actions/runs/39008540842): success.
- Earlier Chromium tests reproduced lost updates when popup and options wrote stale complete settings snapshots. The updated tests require independent changes to survive.

## Implementation

The MV3 service worker queues settings updates within its active instance. Popup and options send targeted patches rather than complete settings snapshots. Favorite addition, removal and clear commands are serialized through the worker. Confirmed operations await `chrome.storage.local.set`.

## Guarantees demonstrated within the tested scope

1. Independent popup and options preference updates survive the tested interleaving.
2. Concurrent favorite additions and removals preserve the expected entries in the tested orders.
3. A confirmed favorite persists after a full Chromium restart with the same temporary profile.
4. Simulated read/write rejection produces an error response; a subsequent operation can succeed.
5. The tests use temporary Chromium profiles and synthetic video metadata, not real YouTube credentials.

## Guarantees not demonstrated

- Durable atomicity across abrupt service-worker termination between read and write.
- Exactly-once command execution if a sender retries after losing the acknowledgement.
- Preservation of concurrent edits to the same list submitted as complete field snapshots (`domains`, `allowChannels`, `blockChannels`, `allowVideos`).
- Crash consistency or durability against device/power failure, quota eviction, or profile corruption.
- Real-browser fault injection into the native Chrome storage implementation: failure tests use a Node.js mock.
- A complete extension security audit or independent human review.

## Residual risks and recommended follow-up

- Use semantic add/remove operations for all mutable collections if multi-interface editing is required.
- For stronger crash consistency, consider durable command identifiers and a recovery protocol; do not claim transactions from an in-memory queue alone.
- Add a controlled worker-lifecycle interruption test separately, with clear distinction between confirmed and unconfirmed writes.
- Review storage failure UI handling so unsuccessful operations are visible to users.

## Decision

**GO technical under conditions; NO MERGE.** Freeze functional changes on PR #7. Keep PR #5 and PR #7 open and unmerged. Do not modify `main` or the intermediate base branches. New application changes require a reproduced blocking defect.
