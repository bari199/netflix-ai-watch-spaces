# Architecture Overview

## System context

Netflix AI Watch Spaces is a JavaScript MERN application. The React/Vite client communicates with an Express REST API. Socket.IO provides authenticated real-time Watch Space events. MongoDB stores users, titles, rooms, chat messages and viewing interactions. MinIO provides S3-compatible object storage for video, thumbnail, subtitle and avatar assets. Cloudflare Workers AI powers retrieval-grounded AI Q&A.

## Runtime components

- **Client:** React 19, Vite, React Router, Axios, Tailwind CSS 4, shadcn-style UI and Socket.IO Client.
- **API and real-time gateway:** Node.js ES modules, Express 5, Mongoose 9 and Socket.IO 4.
- **Database:** MongoDB.
- **Object storage:** MinIO AIStor via AWS SDK S3 client with path-style addressing.
- **AI:** Cloudflare Workers AI; retrieval is grounded in title timeline metadata.
- **Email and identity:** Brevo and Passport Google/Facebook OAuth strategies.

## Main flows

1. The client restores a session through refresh-cookie flow and keeps the access token in memory.
2. Axios sends Bearer-authenticated API requests with credentials-enabled cookies.
3. Express authenticates, validates and dispatches work to controllers/services.
4. Mongoose reads and writes MongoDB documents.
5. Media services store objects in MinIO and persist object keys in MongoDB; API endpoints stream thumbnails, video ranges and subtitle assets.
6. Socket.IO authenticates the handshake token. The user must be a Watch Space participant and join the room before using room-scoped operations.
7. AI Q&A uses playback/timeline-aware retrieval and Cloudflare Workers AI; responses include source timeline events.

## Data relationships

- A **User** hosts or participates in Watch Spaces.
- A **Title** is referenced by Watch Spaces and viewing Interaction records.
- A **WatchSpace** references one Title and one host, and contains participant, playback, vote and session counter state.
- A **ChatMessage** references one WatchSpace and one sender.
- An **Interaction** references one user and one title and stores watch progress/rating.

See [Database Schema](database-schema.md).

## Deployment topology

The planned topology separates the Vercel-hosted static client from a Linux VPS running the Node API/Socket.IO service and Docker-managed MinIO. MongoDB may remain on MongoDB Atlas. Cloudflare Workers AI remains external.

The current `infra/docker.compose.yaml` defines MongoDB and MinIO AIStor only; the Express server and React client are not Compose services. The Compose file currently mounts a Windows-specific MinIO license path and must be adapted before Linux VPS use. See [Setup Guide](setup-guide.md).

## Security boundaries

- Protected REST endpoints use Bearer JWT authentication.
- Refresh tokens are stored in an HTTP-only cookie and hashed in MongoDB.
- Socket.IO authenticates the handshake JWT and checks membership/host authorization.
- Private Watch Spaces enforce host/participant access checks.
- Admin-only title management routes use role authorization.
- Keep MinIO and Cloudflare credentials outside Git.
- Production CORS must allow the exact frontend origin; do not use wildcard origins with credentialed browser traffic.

## Operational notes

- Health endpoint: `GET /api/health`; currently reports API and MongoDB connectivity.
- Socket.IO shares the Express HTTP server.
- Backend startup connects MongoDB and initializes the MinIO bucket before listening.
- `server/src/config/env.js` currently loads `../.env` relative to the process working directory. Ensure the process starts with a compatible working directory or make env loading path-stable before Docker/systemd deployment.
