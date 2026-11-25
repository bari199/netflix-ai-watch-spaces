# Testing and Performance Report

## Automated test inventory

Backend tests live in `server/test/`. Run with:

```bash
cd server
npm test
```

Current repository test files cover admin dashboard, AI ask/retrieval/suggestions, Copilot service, chat sockets, playback buffering/drift/host disconnect/pause/seek/position/sync/trivia/viewer, socket connection, title multipart/subtitle/timeline validation, and variation voting. Recommendation evaluation is available through `npm run evaluate:recommendations`.

## Execution status

This is a test inventory, not a fresh test run. No tests, client build or lint were executed while writing this document. Record results on the final commit before declaring pass.

## PRD performance targets

The current remaining-work checklist records these targets:

| Metric | Target | Measured result |
|---|---:|---|
| Normal API P95 latency | < 200 ms | Not measured |
| AI response P95 latency | < 3 seconds | Not measured |
| Playback drift | < 250 ms | Not measured end-to-end |
| Socket event delivery | < 500 ms | Not measured |
| Trivia marker delivery | < 1 second | Not measured |

Playback socket code has a 0.25-second drift threshold, but a code constant does not prove actual browser-to-browser drift.

## Final verification plan

1. Two authenticated browser sessions: play, pause, seek and resynchronization.
2. Host disconnect and participant state consistency.
3. Room chat send/edit/delete/history/reaction and typing.
4. Timeline trivia and AI Q&A with source timeline entries.
5. Manual/automatic variation vote, expiry, winner and apply timestamp.
6. Subtitle variant switching without interrupting playback.
7. Viewer/host/admin RBAC and private Watch Space access.
8. Home dashboard loading, empty and error states for active/upcoming/history/recommendations.

For each test, record date, commit SHA, environment, steps, observed result and evidence link.
