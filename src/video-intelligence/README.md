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

## Server-side YouTube Data API connector (cycle 88)

`youtube-api.cjs` exports `createYouTubeClient({apiKey,fetchImpl})`. Use only on a trusted server or CLI; do not import this module into the public Chrome extension or commit credentials. The transport is injectable for offline tests. It calls the official `videos.list` endpoint with `snippet,contentDetails` and up to 50 video IDs. Results include normalized public metadata and `missingIds`, without guessing whether an absent video was deleted, private or otherwise inaccessible. Quota errors (`QUOTA_EXCEEDED`), access denials (`ACCESS_DENIED`), and other HTTP errors (`HTTP_ERROR`) are distinguished where the API supplies an error reason.

Run `node --test knowledge-curator/evaluation/youtube-api.test.cjs`. These tests use simulated responses, not live YouTube credentials. API quotas and real-network compatibility require a separate authorized integration test. The connector is not yet wired into the Chrome extension.
