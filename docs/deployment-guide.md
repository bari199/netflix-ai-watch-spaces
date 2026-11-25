# Deployment Guide

## Intended layout

| Component | Target |
|---|---|
| React/Vite frontend | Vercel |
| Express + Socket.IO | Linux VPS |
| MinIO | Same VPS, Docker container with persistent volume |
| MongoDB | MongoDB Atlas |
| AI inference | Cloudflare Workers AI |

## Domain plan

Example subdomains only:
- `app.example.com` → Vercel frontend.
- `api.example.com` → VPS reverse proxy and Node server.
- `media.example.com` → public media endpoint, if configured.

Configure DNS according to actual Vercel and VPS target records.

## VPS deployment outline

1. Provision Ubuntu LTS VPS and secure SSH access.
2. Update OS packages and install Docker Engine + Compose plugin.
3. Create protected directories for environment files and MinIO license.
4. Clone/pull the repository; never put `.env`, access keys or license into Git.
5. Update `infra/docker.compose.yaml` for Linux license path and required networking.
6. Start MongoDB/MinIO services; confirm service status and persistent volumes.
7. Configure backend environment: Atlas URI and MinIO internal network endpoint.
8. Run Node backend behind Nginx/Caddy with HTTPS and websocket upgrade forwarding.
9. Configure firewall; keep MinIO API/console private unless deliberately protected/exposed.
10. Set Vercel environment variables and deploy frontend.
11. Set backend CORS origin to the exact Vercel origin and update OAuth callback URLs.
12. Test health, login/refresh, media upload/stream, Socket.IO room/playback/chat, AI Q&A and variation voting.

## MinIO public access

The current S3 client uses `MINIO_ENDPOINT` as the storage endpoint. OAuth avatar code also derives public avatar URLs from this same value. `http://minio:9000` works for backend-to-MinIO traffic on the Docker network but not from a user's browser. Keep media behind an authenticated API/proxy or add a separate public URL configuration before publishing object URLs.

## Backups

Keep original video files outside the VPS and back up MinIO object data independently. Provider snapshots are not a substitute for testing object-level restore.
