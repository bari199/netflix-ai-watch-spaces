# Netflix AI Watch Spaces — API Reference

Complete REST API reference for local development and production environments.

---

## 1. Environment Configuration

The application supports two environments:

- Development — Local machine
- Production — Deployed application

### 1.1 Development Environment

| Configuration     | URL                                |
| ----------------- | ---------------------------------- |
| Frontend          | `http://localhost:5173`            |
| Backend           | `http://localhost:5000`            |
| REST API Base URL | `http://localhost:5000/api`        |
| Socket.IO Server  | `http://localhost:5000`            |
| Health Check      | `http://localhost:5000/api/health` |

### 1.2 Production Environment

| Configuration     | URL                                                            |
| ----------------- | -------------------------------------------------------------- |
| Frontend          | `https://netflix-ai-watch-spaces-three.vercel.app`             |
| Backend           | `https://netflix-ai-watch-spaces-8zmq.onrender.com`            |
| REST API Base URL | `https://netflix-ai-watch-spaces-8zmq.onrender.com/api`        |
| Socket.IO Server  | `https://netflix-ai-watch-spaces-8zmq.onrender.com`            |
| Health Check      | `https://netflix-ai-watch-spaces-8zmq.onrender.com/api/health` |

> Production backend is hosted on Render and the frontend is deployed on Vercel.

---

## 2. API Configuration

### Frontend Environment Variables

Development (`client/.env` or the configured Vite environment directory):

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Production (Vercel Environment Variables):

```env
VITE_API_BASE_URL=https://netflix-ai-watch-spaces-8zmq.onrender.com/api
VITE_SOCKET_URL=https://netflix-ai-watch-spaces-8zmq.onrender.com
```

### Backend Environment Variables

Development:

```env
NODE_ENV=development
CLIENT_URL=http://localhost:5173
PORT=5000
```

Production:

```env
NODE_ENV=production
CLIENT_URL=https://netflix-ai-watch-spaces-three.vercel.app
```

> Production environment variables must be configured in the Render dashboard. Never commit actual credentials or secrets.

---

## 3. Authentication

### Authentication Headers

Protected endpoints require an access token:

```http
Authorization: Bearer <accessToken>
```

The frontend uses an HTTP-only refresh cookie for session refresh and cookie-based authentication flows.

For cross-origin cookie requests, the frontend must send credentials.

### Authentication Endpoints

Base path: `/api/auth`

| Method | Endpoint             | Access         | Description                |
| ------ | -------------------- | -------------- | -------------------------- |
| POST   | `/register`          | Public         | Register a new account     |
| POST   | `/login`             | Public         | Login as viewer or host    |
| POST   | `/admin/login`       | Public         | Admin login                |
| POST   | `/refresh`           | Refresh cookie | Refresh access token       |
| POST   | `/logout`            | Refresh cookie | Logout                     |
| GET    | `/verify-email`      | Public         | Verify email address       |
| GET    | `/google`            | Public         | Start Google OAuth         |
| GET    | `/google/callback`   | OAuth          | Google OAuth callback      |
| GET    | `/facebook`          | Public         | Start Facebook OAuth       |
| GET    | `/facebook/callback` | OAuth          | Facebook OAuth callback    |
| POST   | `/forgot-password`   | Public         | Request password reset OTP |
| POST   | `/reset-password`    | Public         | Reset password using OTP   |
| PATCH  | `/change-password`   | Authenticated  | Change account password    |

### Registration

```http
POST /api/auth/register
Content-Type: multipart/form-data
```

Fields:

- `name`
- `email`
- `password`
- `avatar` (optional file)

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Example request:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

### Admin Login

```http
POST /api/auth/admin/login
```

Uses the same email and password validation as the normal login endpoint.

### Forgot Password

```http
POST /api/auth/forgot-password
```

Example request:

```json
{
  "email": "user@example.com"
}
```

### Reset Password

```http
POST /api/auth/reset-password
```

Example request:

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "new-password"
}
```

### Change Password

```http
PATCH /api/auth/change-password
Authorization: Bearer <accessToken>
```

Example request:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

---

## 4. User APIs

Base path: `/api/users`

All endpoints require authentication.

| Method | Endpoint          | Access        | Description                    |
| ------ | ----------------- | ------------- | ------------------------------ |
| GET    | `/me`             | Authenticated | Get current user profile       |
| PATCH  | `/me`             | Authenticated | Update profile and preferences |
| PATCH  | `/me/avatar`      | Authenticated | Upload or update avatar        |
| GET    | `/me/avatar`      | Authenticated | Get current user's avatar      |
| GET    | `/:userId/avatar` | Authenticated | Get another user's avatar      |

### Update Profile

```http
PATCH /api/users/me
```

### Upload Avatar

```http
PATCH /api/users/me/avatar
Content-Type: multipart/form-data
```

Multipart field:

```text
avatar
```

---

## 5. Title APIs

Base path: `/api/titles`

### Public Endpoints

| Method | Endpoint                                 | Access | Description             |
| ------ | ---------------------------------------- | ------ | ----------------------- |
| GET    | `/`                                      | Public | Get published titles    |
| GET    | `/:titleId`                              | Public | Get title details       |
| GET    | `/:titleId/thumbnail`                    | Public | Stream title thumbnail  |
| GET    | `/:titleId/video`                        | Public | Stream title video      |
| GET    | `/:titleId/subtitle-variants/:variantId` | Public | Stream subtitle variant |

### Admin Endpoints

| Method | Endpoint                      | Access | Description                     |
| ------ | ----------------------------- | ------ | ------------------------------- |
| POST   | `/`                           | Admin  | Create a title                  |
| PATCH  | `/:titleId`                   | Admin  | Update title and assets         |
| DELETE | `/:titleId`                   | Admin  | Delete title and assets         |
| POST   | `/drafts`                     | Admin  | Create a draft title            |
| GET    | `/drafts`                     | Admin  | List draft titles               |
| GET    | `/drafts/:titleId`            | Admin  | Get a draft title               |
| PATCH  | `/drafts/:titleId`            | Admin  | Update a draft title            |
| PATCH  | `/drafts/:titleId/publish`    | Admin  | Publish a draft title           |
| PUT    | `/:titleId/subtitle-variants` | Admin  | Upload/update subtitle variants |

### Create Title

```http
POST /api/titles
Content-Type: multipart/form-data
```

Multipart fields:

- `video` — Video file
- `thumbnail` — Optional thumbnail
- Additional title information — JSON/text fields

### Video Streaming

```http
GET /api/titles/:titleId/video
```

The video endpoint supports HTTP Range requests for partial video delivery.

Example request header:

```http
Range: bytes=0-1048575
```

Possible successful responses:

- `200 OK` — Full response
- `206 Partial Content` — Partial video response

### Thumbnail

```http
GET /api/titles/:titleId/thumbnail
```

### Subtitle Variant

```http
GET /api/titles/:titleId/subtitle-variants/:variantId
```

---

## 6. Watch Space APIs

Base path: `/api/watch-spaces`

Watch Space endpoints support viewer and host accounts unless otherwise specified.

### Discovery and Listing

| Method | Endpoint         | Access                    | Description                                |
| ------ | ---------------- | ------------------------- | ------------------------------------------ |
| GET    | `/`              | Public                    | List active public Watch Spaces            |
| GET    | `/upcoming`      | Authenticated Viewer/Host | Get current user's upcoming rooms          |
| GET    | `/my-active`     | Authenticated Viewer/Host | Get current user's active rooms            |
| GET    | `/my-ended`      | Authenticated Viewer/Host | Get current user's ended rooms             |
| GET    | `/my`            | Authenticated Viewer/Host | Get rooms hosted or joined by current user |
| GET    | `/my-hosted`     | Authenticated Viewer/Host | Get rooms hosted by current user           |
| GET    | `/:watchSpaceId` | Authenticated Viewer/Host | Get Watch Space details                    |

### Create and Join

| Method | Endpoint               | Access                    | Description          |
| ------ | ---------------------- | ------------------------- | -------------------- |
| POST   | `/`                    | Authenticated Viewer/Host | Create a Watch Space |
| POST   | `/:watchSpaceId/join`  | Authenticated Viewer/Host | Join a Watch Space   |
| POST   | `/:watchSpaceId/leave` | Authenticated Viewer/Host | Leave a Watch Space  |

### Host Management

| Method | Endpoint                                          | Access | Description             |
| ------ | ------------------------------------------------- | ------ | ----------------------- |
| POST   | `/:watchSpaceId/end`                              | Host   | End a Watch Space       |
| DELETE | `/:watchSpaceId`                                  | Host   | Delete a Watch Space    |
| PATCH  | `/:watchSpaceId/participants/:participantId/mute` | Host   | Mute/unmute participant |
| DELETE | `/:watchSpaceId/participants/:participantId`      | Host   | Remove participant      |
| PATCH  | `/:watchSpaceId/lock`                             | Host   | Lock/unlock Watch Space |
| PATCH  | `/:watchSpaceId/playback-mode`                    | Host   | Change playback mode    |
| PATCH  | `/:watchSpaceId/transfer-host`                    | Host   | Transfer host role      |

### Playback Mode

```http
PATCH /api/watch-spaces/:watchSpaceId/playback-mode
```

Example request:

```json
{
  "mode": "manual"
}
```

Supported modes:

- `manual`
- `automatic`

### Lock Watch Space

```http
PATCH /api/watch-spaces/:watchSpaceId/lock
```

Example request:

```json
{
  "isLocked": true
}
```

### Mute Participant

```http
PATCH /api/watch-spaces/:watchSpaceId/participants/:participantId/mute
```

Example request:

```json
{
  "isMuted": true
}
```

### Transfer Host

```http
PATCH /api/watch-spaces/:watchSpaceId/transfer-host
```

Example request:

```json
{
  "newHostId": "MONGODB_USER_ID"
}
```

---

## 7. AI Co-pilot APIs

Base path: `/api/watch-spaces/:watchSpaceId/ai`

All endpoints require an authenticated Watch Space participant.

| Method | Endpoint       | Access                    | Description                       |
| ------ | -------------- | ------------------------- | --------------------------------- |
| GET    | `/suggestions` | Authenticated Viewer/Host | Get playback-aware AI suggestions |
| POST   | `/ask`         | Authenticated Viewer/Host | Ask AI a question                 |

### Get AI Suggestions

```http
GET /api/watch-spaces/:watchSpaceId/ai/suggestions
```

### Ask AI

```http
POST /api/watch-spaces/:watchSpaceId/ai/ask
Content-Type: application/json
```

Example request:

```json
{
  "question": "What is happening in this scene?"
}
```

---

## 8. Recommendation APIs

Base path: `/api/recommendations`

| Method | Endpoint    | Access        | Description                      |
| ------ | ----------- | ------------- | -------------------------------- |
| GET    | `/?limit=5` | Authenticated | Get personalized recommendations |

Example:

```http
GET /api/recommendations?limit=5
```

The `limit` parameter is optional and accepts values from 1 to 20.

---

## 9. Interaction APIs

Base path: `/api/interactions`

| Method | Endpoint            | Access        | Description                 |
| ------ | ------------------- | ------------- | --------------------------- |
| GET    | `/recently-watched` | Authenticated | Get recently watched titles |

---

## 10. Analytics APIs

Base path: `/api/analytics`

| Method | Endpoint         | Access | Description               |
| ------ | ---------------- | ------ | ------------------------- |
| GET    | `/:watchSpaceId` | Host   | Get Watch Space analytics |

Example:

```http
GET /api/analytics/:watchSpaceId
```

---

## 11. Admin APIs

Base path: `/api/admin`

| Method | Endpoint              | Access | Description                  |
| ------ | --------------------- | ------ | ---------------------------- |
| GET    | `/dashboard/overview` | Admin  | Get admin dashboard overview |

---

## 12. Health Check

The health endpoint checks API availability and MongoDB connection status.

```http
GET /api/health
```

### Development

```text
http://localhost:5000/api/health
```

### Production

```text
https://netflix-ai-watch-spaces-8zmq.onrender.com/api/health
```

Example response:

```json
{
  "success": true,
  "message": "Netflix AI Watch Spaces API health status",
  "services": {
    "api": "running",
    "database": "connected"
  },
  "timestamp": "2026-11-26T09:47:31.447Z"
}
```

Possible status codes:

| Status | Meaning                      |
| ------ | ---------------------------- |
| 200    | API and database are healthy |
| 503    | Database is disconnected     |

---

## 13. Common HTTP Status Codes

| Status Code | Meaning                            |
| ----------- | ---------------------------------- |
| 200         | Request successful                 |
| 201         | Resource created                   |
| 400         | Bad request or validation error    |
| 401         | Authentication required or invalid |
| 403         | Access forbidden                   |
| 404         | Resource not found                 |
| 500         | Internal server error              |
| 503         | Service unavailable                |

Actual response status codes and JSON structures depend on the corresponding controller and middleware.

---

## 14. Important Notes

1. Protected REST endpoints require a valid access token unless the endpoint uses a refresh-cookie or OAuth flow.
2. The frontend Axios instance uses `withCredentials: true`.
3. Video streaming supports HTTP Range requests.
4. Media endpoints return streams rather than ordinary JSON responses.
5. Title management and draft management are restricted to admin accounts.
6. Watch Space management operations are restricted to the host where specified.
7. Socket.IO uses the environment-specific server URL listed in Section 1.
8. Actual request validation and response structures should be checked against the relevant backend controller.
9. Never expose environment secrets, access tokens, refresh tokens, or storage credentials.
10. Production and development environments use the same API route structure but different server URLs.

---

**Documentation:** Netflix AI Watch Spaces API Reference  
**Repository:** https://github.com/bari199/netflix-ai-watch-spaces  
**Backend:** Node.js + Express.js  
**Database:** MongoDB + Mongoose  
**Real-time Communication:** Socket.IO  
**Video Streaming:** HTTP Range-based streaming
