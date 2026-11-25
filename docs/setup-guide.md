# Setup and Run Guide

## Prerequisites

- Node.js compatible with the committed lockfiles.
- npm.
- MongoDB local Docker service or MongoDB Atlas.
- MinIO AIStor/S3-compatible service. The current Compose configuration requires a license file.
- Cloudflare account/API token for Workers AI.
- Brevo and Google/Facebook OAuth credentials when those integrations are enabled.
- Docker Desktop (Windows) or Docker Engine + Compose plugin (Linux).

## Repository layout

- `client/`: React/Vite frontend.
- `server/`: Express API, Socket.IO, Mongoose models, services, tests and scripts.
- `infra/docker.compose.yaml`: MongoDB and MinIO AIStor infrastructure.
- `docs/`: project documentation.

## Environment setup

Copy the root `.env.example` to root `.env`, then set valid values. Never commit real credentials.

Important: the current example and runtime config are not fully aligned. Runtime requires `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `MINIO_ENDPOINT`, `MINIO_BUCKET`, `NETFLIX_MINIO_ROOT_USER`, `NETFLIX_MINIO_ROOT_PASSWORD`, Google and Facebook OAuth variables. AI requires Cloudflare variables. The example includes legacy/duplicate names such as JWT_ACCESS_SECRET/JWT_REFRESH_SECRET and MINIO_ACCESS_KEY/MINIO_SECRET_KEY. Match actual runtime names in `server/src/config/env.js`, `server/src/config/minio.js` and related services.

The env loader calls `dotenv.config({ path: "../.env" })` relative to process working directory. Start backend from `server/` for the current local layout, or make the env path independent of working directory before running under Docker/systemd.

## Start MongoDB and MinIO locally

From repository root:

```powershell
docker compose -f infra/docker.compose.yaml up -d
docker compose -f infra/docker.compose.yaml ps
```

The current Compose file exposes loopback-only host ports:
- MongoDB: `127.0.0.1:27018` → container 27017.
- MinIO S3 API: `127.0.0.1:9002` → container 9000.
- MinIO Console: `127.0.0.1:9003` → container 9001.

Persistent named volumes:
- `netflix_mongodb_data`
- `netflix_minio_data`

MinIO uses `quay.io/minio/aistor/minio:latest` and starts with `--license /minio.license`. The current Compose bind mount `C:/MinIO/minio.license` is Windows-specific. On Linux VPS, provide the license at a protected Linux host path and update the bind mount. Do not store the license in Git.

## Backend

```powershell
cd server
npm ci
npm run dev
```

The server connects to MongoDB, initializes the MinIO bucket, then listens on `PORT` (default 5000). Health endpoint: `http://localhost:5000/api/health`.

For local Compose MongoDB: `MONGODB_URI=mongodb://127.0.0.1:27018/netflix_ai_watch_spaces`. For MinIO with Node on Windows host: `MINIO_ENDPOINT=http://127.0.0.1:9002`. When Node runs inside the same Compose network, the internal endpoint is `http://minio:9000`.

## Frontend

```powershell
cd client
npm ci
npm run dev
```

Set `VITE_API_BASE_URL=http://localhost:5000/api` in client environment. Optional `VITE_SOCKET_URL` points at the backend origin; otherwise socket origin is derived from API base URL.

Build/lint:

```powershell
npm run build
npm run lint
```

## Production notes

- Vercel `VITE_API_BASE_URL`: HTTPS API URL.
- Vercel `VITE_SOCKET_URL`: backend origin.
- Backend `CLIENT_URL`: exact Vercel frontend origin.
- Ensure reverse proxy forwards websocket upgrades.
- Backend in Docker should use `minio:9000` for internal S3 access. A Docker hostname is not browser-accessible; OAuth avatar helper currently builds public avatar URL from MINIO_ENDPOINT. Separate public media URL handling before using internal host endpoint for production OAuth avatar URLs.
- Keep MongoDB/MinIO persistent data and maintain independent backups.
