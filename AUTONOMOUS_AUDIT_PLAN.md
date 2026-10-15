# Autonomous audit — deployment plan

## Status
Scaffold only. This branch does **not** run an AI coding agent yet.

## Baseline
Derived from `agent/recursive-audit` to preserve cycles 1–6 and `AUDIT_LOOP.md`. The production branch `main` is not modified.

## Target design
1. Scheduled/manual GitHub Actions dispatch (default read-only).
2. Run existing Node and browser regression tests using commands discovered from repository manifests.
3. Read `AUDIT_LOOP.md` and open CI failures, choose one reproducible P1/P2 defect.
4. Invoke a specifically configured coding-agent runtime with narrowly scoped credentials and capped usage.
5. Create a fresh topic branch and draft PR; never push to `main` or auto-merge.
6. Update the audit journal with evidence, test outputs, commit and PR links.
7. Next scheduled invocation resumes from journal and current CI status.

## Mandatory guardrails
- Require a dedicated API credential stored as a GitHub Actions secret; never print it.
- No untrusted PR code receives write tokens or model credentials.
- Pin third-party Actions by commit SHA before enabling write access.
- Concurrency 1, bounded cycles and runtime, budget ceilings, no recursive self-trigger.
- Read-only default token; a separate approved write job is required for commits/PRs.
- Human review required before merge.
- Fail closed on unavailable tests, permissions or malformed state.

## Activation checklist
- [ ] Identify exact project subdirectory, package manager and test commands.
- [ ] Confirm current CI and browser tests on the audit branch.
- [ ] Choose agent provider/runtime and configure secret and spending cap.
- [ ] Implement agent runner, explicit tool allowlist and structured result validation.
- [ ] Test in dry-run, including API failure, storage failure and CI failure.
- [ ] Enable scheduled agent writes only after human approval.

## Next audit target
Validate cycle 6 CI and corrupted recovery journal tests. Do not claim atomicity for multi-key localStorage updates.
