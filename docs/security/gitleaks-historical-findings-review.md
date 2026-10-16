# Gitleaks forensic justification — draft, not an allowlist

Status: **NOT APPROVED FOR EXCEPTIONS**. No fingerprints or detected values are disclosed here.

## Scope and observed evidence

Scanner: Gitleaks v8.24.3, rule `generic-api-key`. Five findings in one HMAC equality group, five distinct Gitleaks fingerprints. The history inventory previously scanned 455 commits and later 1,305 matching snapshots across four paths; these counts reflect historical snapshots, not unique secrets.

| Commit | Historical file | Independent context | Status |
| --- | --- | --- | --- |
| `4a0fff15d734` | `knowledge-curator/attempts.cjs` | `KEY` passed to storage read/write helpers | Probable storage identifier |
| `149bdd12227d` | `knowledge-curator/tests/browser.spec.cjs` | Browser import recovery test with local storage reads/writes | Probable storage identifier |
| `4d5e863a93c6` | `knowledge-curator/tests/browser.spec.cjs` | Interrupted import recovery and local storage assertions | Probable storage identifier |
| `602e38bb00b9` | `knowledge-curator/tests/browser.spec.cjs` | Simulated rollback failure in storage layer | Probable storage identifier |
| `be3cacc01a79` | `knowledge-curator/tests/browser.spec.cjs` | IndexedDB migration and legacy storage checks | Probable storage identifier |

Current module relationships: `attempts.cjs` declares an attempts storage key; `state-v3.cjs` reads the legacy attempts key during migration; `state-v3.test.cjs` exercises that migration through a fake storage adapter.

## Limitations

- Static inspection of selected diffs and current modules does not establish all historical runtime flows or absence of sensitive reuse.
- The equality grouping proves one repeated detected value, not that it is intrinsically non-sensitive.
- No exception is approved, generated, or activated.
- The Gitleaks scan must continue failing on unresolved findings.

## Conditions before any targeted exception

1. Independently establish that the exact reported value is the intended public storage identifier in all relevant historical contexts.
2. Review uses across reachable Git history, including aliases and dynamically constructed uses, and document any unexamined branches.
3. Confirm that no authentication, network authorization, or secret configuration relies on the value.
4. Validate each of the five Gitleaks fingerprints in a protected runner; do not publish raw fingerprints or secret values.
5. Add only exact-fingerprint allowlist entries after approval, with regression tests demonstrating a separate synthetic API key still triggers detection.
6. Re-run Gitleaks and functional CI on the final commit.

Decision: **NO-GO for merge pending verification and controlled exception review.**
