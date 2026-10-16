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

## V0.3 — Unicode terms and metadata comparison (2026-10-16)

- Fixed JS ASCII-only word boundaries with Unicode-aware token boundaries and explicit complete French word forms. Added explicit Pythagoras and second-degree equation terms.
- Regression checks include French accents, English terms, mathematics series vs generic video series, and negative titles.
- Original ten titles: all recognized as mathematically relevant in balanced mode; Pythagoras now has geometry domain and quadratic-equation proof elementary/algebra domain.
- Eight of ten corpus records contain **verified partial description excerpts**, not full descriptions. With title only, all ten strict decisions are `unknown`; with available excerpts, three become `show`, four `hide` and one remains `unknown`. This does not measure full-description behavior.
- Synthetic adversarial **text fixtures** (14, not YouTube videos): TP 7, FP 2, TN 5, FN 0; precision 0.778, recall 1.0, F1 0.875. These metrics are **not** real-video precision and do not measure mathematical correctness.
- False positives in synthetic fixtures: geometric graphic design, and an equation-themed get-rich-fast title. These reveal semantic ambiguity that lexical classification cannot resolve reliably.
- No independently validated real-video negative set was available. Do not claim real-world false-positive rates or video pedagogical quality.

### Next experiment

Collect 10–20 real negative and ambiguous videos with independently documented relevance labels; obtain full descriptions where permitted, and evaluate precision, recall and abstention policy on a held-out corpus. Preserve the original V0.2 baseline for comparison.

## Cycle 85 — First real negative YouTube controls

Three real YouTube videos were verified using publicly indexed titles and descriptions:
- `k90y6PIzIaE` — Official Geometry Dash Trailer (game trailer).
- `eG-mAFt8hYg` — Math Rock Beginner Guitar Lesson (guitar).
- `DX_NtGg9ESY` — Beginner Math Rock/Midwest Emo Guitar Lesson (guitar).

All three are provisional **non-mathematics-teaching** labels based on their descriptions. The actual `src/scoring.js`, using only titles, marked all three as mathematically relevant (3/3 pilot false positives). These are not independent double annotations, and three deliberately difficult negatives do not support a population-level false-positive rate.

Root causes indicated by metadata: `Geometry Dash` matches geometry; `math rock` matches math. The next correction should introduce a narrowly scoped ambiguity-handling policy backed by real positive/negative controls, rather than hard-coding arbitrary channel or video IDs.

vidIQ has zero credits remaining, with renewal reported for 2026-11-06. This pilot used publicly indexed YouTube descriptions instead. Do not claim full transcript validation.
