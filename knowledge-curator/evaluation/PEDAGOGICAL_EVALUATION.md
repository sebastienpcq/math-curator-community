# PEDAGOGICAL EVALUATION — Pilot V0.2

## Evidence and execution

- Ten distinct public YouTube videos verified with vidIQ metadata.
- All ten transcripts retrieved successfully during the audit, but raw transcripts are not stored in the repository.
- Provider language metadata may be inconsistent with spoken language: Maître Lucas returned `en` despite French transcript; Khan Academy calculus returned `pt-BR`.
- Actual `src/scoring.js` and `src/config.js` executed against ten verified titles. Input `context` deliberately empty because complete descriptions were not preserved in this first reproducible dataset.
- Evaluation settings: `enabled:true`, `level:'all'`, default threshold 42, empty domain/allow/block lists; balanced and strict modes.

## Results

See `SCORING_BASELINE.json`.

- Balanced: 10 show, 0 hide, 0 unknown.
- Strict: 0 show, 0 hide, 10 unknown (weak metadata confidence; content scripts hide unknown in strict mode).
- Scores: 48, 56, 50, 58, 61, 68, 68, 58, 43, 56 (maximum possible 85).
- Pythagoras demonstration and quadratic equation proof: mathematically relevant according to the engine but no domain detected.
- `MathScoring.evaluate` does not inspect video transcripts or validate mathematical truth.

## Interpretation

These ten videos were intentionally selected as mathematical candidates, so this is a **positive-only smoke corpus**, not a representative evaluation sample. It cannot yield reliable precision, specificity, or a meaningful false-positive rate. Ten balanced-mode accepts are not evidence of pedagogical correctness. Strict-mode unknowns reflect the lack of extended metadata in the test input; they do not prove that strict mode always rejects actual YouTube videos.

## Next experiments

1. Capture legally accessible description snippets and run a paired title-only vs title+description baseline.
2. Add at least 10 difficult negatives and 10 ambiguous cases; independently annotate topic relevance and suitability before scoring.
3. Check accented Unicode word boundaries and domain detection for geometry, second-degree equations, probabilities and topology.
4. Add evidence-backed transcript annotations, including exact mathematical claims requiring review; use visual inspection where essential.
5. Measure confusion matrices only after independent reference labels and a predeclared decision policy for `unknown`.

## Safety and scope

No production scoring changes. No merge, release or main modification. vidIQ credit balance prevented further metadata fetches in this session; all ten original video identities were already verified before the limit was reached.
