# Netflix AI Watch Spaces

**AI-powered synchronized watch parties, real-time collaboration, and retrieval-grounded scene intelligence.**

Netflix AI Watch Spaces brings friends into synchronized movie sessions with shared playback, live chat, group presence, timeline-aware trivia, AI Co-Pilot Q&A and collaborative narrative voting.

## Product previews

### Home
![Netflix AI Watch Spaces Home](https://res.cloudinary.com/drwflyyk/image/upload/v1795584480/Netflix_AI_Watch_Spaces_Dashboard.png)

### Watch Spaces
![Watch Spaces UI](https://res.cloudinary.com/drwflyyk/image/upload/v1795584525/watchspace.png)

### Watch Space Details
![Watch Space Details UI](https://res.cloudinary.com/drwflyyk/image/upload/v1795584505/watch_space_details.png)

### Admin Dashboard
![Admin Dashboard UI](https://res.cloudinary.com/drwflyyk/image/upload/v1795584577/Admin-dashboard.png)

## Core capabilities

- Synchronized host-controlled playback with drift correction and reconnect support.
- Live room chat, participant presence and message reactions.
- Scheduled Watch Spaces, quick rejoin and watch-history interactions.
- Timeline-grounded AI questions and playback-aware suggestions using Cloudflare Workers AI.
- Timeline trivia events and manual/automatic narrative variation voting.
- Subtitle variants linked to timeline events and variation options.
- Hybrid content recommendations.
- Admin title/draft management, video/thumbnail upload and timeline metadata tools.
- MinIO-backed object storage for video, thumbnail, subtitle and avatar assets.

## Technology stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Axios, Socket.IO Client.
- **Backend:** Node.js, Express 5, JavaScript ES modules, Mongoose and Socket.IO.
- **Database:** MongoDB.
- **Object storage:** MinIO AIStor / S3-compatible API.
- **AI:** Cloudflare Workers AI.
- **Email/OAuth:** Brevo, Passport Google and Facebook OAuth.

## Repository structure

```text
client/                  React + Vite application
server/                  Express API, Socket.IO, models, services and tests
infra/docker.compose.yaml MongoDB + MinIO AIStor infrastructure
docs/                    Architecture, API, events, schema, setup and reports
.env.example              Environment variable template (review before use)
```

## Quick start

Prerequisites: Node.js, npm, Docker Desktop/Engine, MongoDB and a MinIO AIStor license for the Compose configuration.

1. Copy `.env.example` to the repository-root `.env` and set real local values. Do not commit `.env`.
2. Start MongoDB and MinIO from the repository root:

   ```bash
   docker compose -f infra/docker.compose.yaml up -d
   ```

3. Start the backend:

   ```bash
   cd server
   npm ci
   npm run dev
   ```

4. In a second terminal, start the client:

   ```bash
   cd client
   npm ci
   npm run dev
   ```

5. Open the Vite URL shown in the terminal. Backend health check: `http://localhost:5000/api/health`.

> The current example environment has legacy/duplicate names and must be reconciled with runtime config before first run. The Compose MinIO license mount is Windows-specific and must be changed for Linux VPS deployment. See [Setup Guide](docs/setup-guide.md).

## Documentation

- [Architecture](docs/architecture.md)
- [REST API Reference](docs/api-reference.md)
- [Socket.IO Events](docs/socket-events.md)
- [Database Schema](docs/database-schema.md)
- [Setup and Run Guide](docs/setup-guide.md)
- [Deployment Guide](docs/deployment-guide.md)
- [Testing and Performance](docs/testing-and-performance.md)
- [Known Limitations and Retrospective](docs/known-limitations-and-retrospective.md)
- [Remaining Work Checklist](docs/netflix-ai-watch-spaces-remaining-work.txt)

## Tests

Backend: `cd server && npm test`. Frontend: `cd client && npm run build && npm run lint`.

Test inventory and unmeasured performance targets are documented in [Testing and Performance](docs/testing-and-performance.md). No test result is claimed here unless run on the referenced commit.

## License

The repository currently declares the server package license as ISC. Review project asset rights and third-party media/image licenses separately before public release.
