# Known Limitations and Retrospective

## Known limitations / deployment checks

- `infra/docker.compose.yaml` currently defines MongoDB and MinIO only; frontend and backend are separate deployments.
- MinIO AIStor Compose command requires a license file, and committed host bind mount is Windows-specific. Linux deployment needs a valid Linux host path and a tested license mount.
- `MINIO_ENDPOINT` is used as S3 SDK endpoint and by OAuth avatar helper to construct public URLs. An internal Docker hostname is not browser-accessible; separate internal and public media URL configuration before production.
- `server/src/config/env.js` resolves the root .env by process-working-directory-relative path. Docker/systemd working directory must be deliberate or env path made stable.
- Root `.env.example` contains legacy/duplicate JWT and MinIO names that do not all match runtime.
- Root `.gitignore` currently ignores `.env.example`; review this so safe examples remain tracked.
- Socket.IO currently configures `origin: "*"`; restrict production origins and verify credentialed transports.
- Variation vote timers and some playback trackers are in-memory maps. Persisted vote state supports recovery, but multi-process timer ownership/scaling is not established.
- Analytics currently derives session duration, peak participants, AI question count, triggered trivia count and chat count. Verify the counters against a real completed session.
- Performance targets are not measured in this documentation commit.

## Retrospective template

Complete after final deployment/demo:
- What worked reliably.
- Bugs discovered and fixes.
- Performance measurements and test environment.
- Lessons from Vercel, VPS, Docker, MinIO and MongoDB Atlas deployment.
- Limitations accepted for the project demonstration.
- Future improvements.

Do not claim reliability or performance improvements without recorded evidence.
