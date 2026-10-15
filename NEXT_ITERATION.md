# Resume point — Cycle 31

1. Inspect CI for latest commit on `agent/recursive-audit`; inspect job logs if failure.
2. Audit the experimental adapter's `transact` validator: it checks only a shallow schema, unlike `state-v3.cjs`.
3. Test simultaneous writes to legacy localStorage during the migration snapshot. The pending-journal guard alone cannot prevent this race.
4. Test durability after closing all Chromium pages and reopening a fresh browser context.
5. Decide whether to use IndexedDB as the single authoritative store and provide a reversible migration plan; no UI activation until these pass.
6. Keep PR #2 in draft; no merge or release without explicit approval.
