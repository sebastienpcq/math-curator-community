# Video Intelligence — first independent module

This directory introduces a **provider-independent adapter** for public YouTube metadata. It does not clone vidIQ's proprietary code, access captions, bypass access controls, or require a vidIQ account.

## API

`normalizeVideo({id|videoId,title,channel|channelTitle,context|description})` validates the 11-character YouTube ID and normalizes bounded strings.

`classify(video, MathScoring, settings)` calls the real existing `evaluate` and `decide` methods. It returns the normalized video, metadata-only evaluation, decision, and a provenance warning.

## Local test

`node --test knowledge-curator/evaluation/video-intelligence.test.cjs`

The tests cover malformed IDs, missing titles, a verified ten-video positive corpus and three real negative controls. The latter currently expose false positives in the lexical scorer; this adapter deliberately does not claim to solve semantic ambiguity.

## Next implementation gates

1. Add a separately deployed, authorized YouTube Data API v3 metadata fetcher, with quotas, retry handling and an API key kept outside the public extension.
2. Compare API-provided full descriptions with title-only scores.
3. Introduce a dedicated ambiguity policy, independently tested on real negative and positive videos.
4. Add opt-in transcript ingestion only for content with lawful access.
5. Keep scoring provenance separate from any claim of mathematical correctness.

The adapter is not wired into the Chrome UI, and no external network calls occur.
