# REST API Reference

Base path: `/api`. Protected endpoints require `Authorization: Bearer <accessToken>`, except refresh/logout flows that use the refresh cookie as implemented by the auth controller.

## Health

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API and MongoDB health status |

## Authentication — `/api/auth`

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Create local account; optional multipart avatar |
| POST | `/login` | Public | Viewer/host login |
| POST | `/admin/login` | Public | Admin login |
| POST | `/refresh` | Refresh cookie | Refresh/rotate access session |
| POST | `/logout` | Refresh cookie | Logout |
| GET | `/verify-email` | Public | Verify email |
| GET | `/google` | Public | Start Google OAuth |
| GET | `/google/callback` | OAuth | Google callback |
| GET | `/facebook` | Public | Start Facebook OAuth |
| GET | `/facebook/callback` | OAuth | Facebook callback |
| POST | `/forgot-password` | Public | Request reset OTP |
| POST | `/reset-password` | Public | Reset password with OTP |
| PATCH | `/change-password` | Authenticated | Change password |

## Users — `/api/users`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/me` | Authenticated | Current user profile |
| PATCH | `/me` | Authenticated | Update name/preferences |
| PATCH | `/me/avatar` | Authenticated | Upload avatar; multipart field `avatar` |
| GET | `/me/avatar` | Authenticated | Stream current user's avatar |
| GET | `/:userId/avatar` | Authenticated | Stream selected user's avatar |

## Titles — `/api/titles`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | List published titles |
| GET | `/:titleId` | Public | Get title details |
| GET | `/:titleId/thumbnail` | Public | Stream thumbnail from MinIO |
| GET | `/:titleId/video` | Public | Stream video with HTTP Range support |
| GET | `/:titleId/subtitle-variants/:variantId` | Public | Stream subtitle variant |
| POST | `/` | Admin | Create title with video and optional thumbnail |
| PATCH | `/:titleId` | Admin | Update title/assets |
| DELETE | `/:titleId` | Admin | Delete title/assets |
| POST | `/drafts` | Admin | Create draft |
| GET | `/drafts` | Admin | List drafts |
| GET | `/drafts/:titleId` | Admin | Read draft |
| PATCH | `/drafts/:titleId` | Admin | Update draft |
| PATCH | `/drafts/:titleId/publish` | Admin | Publish draft |
| PUT | `/:titleId/subtitle-variants` | Admin | Upload/update subtitle variants |

Title create/update uses multipart data with `video`, optional `thumbnail`, and JSON text fields such as genre/timeline.

## Watch Spaces — `/api/watch-spaces`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | Public | List active public Watch Spaces |
| GET | `/upcoming` | Authenticated viewer/host | Current user's scheduled rooms |
| GET | `/my-active` | Authenticated viewer/host | Current user's active rooms |
| GET | `/my-ended` | Authenticated viewer/host | Current user's ended rooms |
| GET | `/my-hosted` | Authenticated viewer/host | Rooms hosted by current user |
| GET | `/:watchSpaceId` | Authenticated viewer/host | Get Watch Space |
| GET | `/:watchSpaceId/ai/suggestions` | Authenticated participant | Playback-aware AI suggestions |
| POST | `/:watchSpaceId/ai/ask` | Authenticated participant | Ask grounded AI question |
| POST | `/` | Authenticated viewer/host | Create Watch Space |
| POST | `/:watchSpaceId/join` | Authenticated viewer/host | Join room |
| POST | `/:watchSpaceId/leave` | Authenticated viewer/host | Leave room |
| POST | `/:watchSpaceId/end` | Host | End room |
| DELETE | `/:watchSpaceId` | Host | Delete room |
| PATCH | `/:watchSpaceId/participants/:participantId/mute` | Host | Mute/unmute participant |
| DELETE | `/:watchSpaceId/participants/:participantId` | Host | Remove participant |
| PATCH | `/:watchSpaceId/lock` | Host | Lock/unlock room |
| PATCH | `/:watchSpaceId/playback-mode` | Host | Set manual/automatic mode |
| PATCH | `/:watchSpaceId/transfer-host` | Host | Transfer host role |

## Other APIs

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/recommendations?limit=5` | Authenticated | Personalized recommendations |
| GET | `/api/interactions/recently-watched` | Authenticated | Recent viewing interactions |
| GET | `/api/analytics/:watchSpaceId` | Authenticated host | Session analytics |
| GET | `/api/admin/dashboard/overview` | Admin | Admin dashboard overview |

## Response notes

JSON shapes are controller-specific. Validation/auth failures use 4xx responses; unexpected failures use 500. Media endpoints return streams rather than JSON. Always check the matching controller when relying on specific response fields.
