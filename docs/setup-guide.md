# 🎬 Netflix AI Watch Spaces — Setup & Development Guide

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-ES_Modules-339933?logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-9-47A248?logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white" />
</p>

Complete guide to understanding the repository, installing dependencies, configuring services, and running Netflix AI Watch Spaces locally.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [Frontend UI & Design System](#-frontend-ui--design-system)
4. [Project Folder Structure](#-project-folder-structure)
5. [Prerequisites](#-prerequisites)
6. [Clone the Repository](#-clone-the-repository)
7. [Environment Configuration](#-environment-configuration)
8. [Start MongoDB](#-start-mongodb)
9. [Run the Backend](#-run-the-backend)
10. [Run the Frontend](#-run-the-frontend)
11. [Available Commands](#-available-commands)
12. [Production Configuration](#-production-configuration)
13. [Troubleshooting](#-troubleshooting)
14. [Security Checklist](#-security-checklist)

---

## 🎬 Project Overview

Netflix AI Watch Spaces is a full-stack collaborative movie-watching platform.

It enables users to create and join Watch Spaces, watch movies together with synchronized playback, communicate through real-time chat, participate in timeline-based trivia and interact with AI-powered scene intelligence.

### Core Features

- Host-controlled synchronized video playback.
- Real-time Watch Space communication using Socket.IO.
- Participant presence and room management.
- AI Co-Pilot with timeline-grounded questions.
- Timeline trivia and collaborative narrative voting.
- Subtitle variants and timeline events.
- Hybrid content recommendations.
- User authentication and social OAuth.
- Admin dashboard and title management.
- Video and media object storage.

---

## 🧰 Technology Stack

### Frontend

| Technology       | Purpose                           |
| ---------------- | --------------------------------- |
| React 19         | Component-based UI                |
| Vite 8           | Development server and build tool |
| React Router 7   | Client-side routing               |
| Tailwind CSS 4   | Utility-first styling             |
| shadcn/ui        | UI component system and tooling   |
| Base UI React    | Accessible component primitives   |
| Lucide React     | Icons                             |
| Motion           | UI animations and transitions     |
| Axios            | REST API communication            |
| Socket.IO Client | Real-time communication           |
| React Hot Toast  | Toast notifications               |
| Geist Variable   | Typography                        |

### Backend

| Technology         | Purpose                           |
| ------------------ | --------------------------------- |
| Node.js            | JavaScript runtime                |
| Express 5          | REST API                          |
| MongoDB            | Database                          |
| Mongoose 9         | ODM and schema management         |
| Socket.IO 4        | Real-time events                  |
| JWT                | Authentication                    |
| Passport.js        | OAuth authentication              |
| Multer             | File upload middleware            |
| AWS SDK v3         | S3-compatible storage integration |
| Helmet             | HTTP security headers             |
| Express Rate Limit | Request rate limiting             |
| Brevo              | Transactional email               |

### External Services

| Service               | Purpose               |
| --------------------- | --------------------- |
| MongoDB Atlas         | Production database   |
| Backblaze B2          | Object storage        |
| Cloudflare Workers AI | AI inference          |
| Brevo                 | Email delivery        |
| Google OAuth          | Social authentication |
| Facebook OAuth        | Social authentication |
| Vercel                | Frontend hosting      |
| Render                | Backend hosting       |

---

## 🎨 Frontend UI & Design System

The frontend uses a combination of utility-first styling, accessible primitives, reusable components, icons and animations.

### UI Libraries

| Library                        | Usage                           |
| ------------------------------ | ------------------------------- |
| Tailwind CSS 4                 | Main styling system             |
| shadcn/ui                      | Reusable UI component structure |
| Base UI React                  | Accessible UI primitives        |
| class-variance-authority (CVA) | Component variants              |
| `cn`                           | Class-name utility              |
| Lucide React                   | UI icons                        |
| Motion                         | Animation and transitions       |
| React Hot Toast                | Notification feedback           |
| Geist Variable                 | Application font                |

### UI Implementation Details

**1. Tailwind CSS 4**

- Utility-based responsive layouts.
- Dark theme styling.
- Custom colors and design tokens.
- Responsive Watch Space layouts.
- Reusable visual patterns.

**2. shadcn/ui + Base UI**

- Reusable UI components.
- Accessible interaction primitives.
- Component variants and sizes.
- Consistent controls across the application.

The repository's button component uses `@base-ui/react/button`, `class-variance-authority` and the `cn` utility.

**3. Lucide React**

Used for navigation, actions, playback controls, admin navigation and other interface icons.

**4. Motion**

Used for animated navigation, menus, drawers, transitions and interface feedback.

**5. Typography and Theme**

- Font: Geist Variable.
- Primary accent: Netflix Red (`#E50914`).
- Dark background and surface colors.
- CSS custom properties for theme tokens.
- Responsive mobile and desktop layouts.

### Styling Entry Point

Main stylesheet:

`client/src/index.css`

It imports:

- `tailwindcss`
- `tw-animate-css`
- `shadcn/tailwind.css`
- `@fontsource-variable/geist`

---

## 📁 Project Folder Structure

The following Explorer-style tree highlights the repository's main application areas and important files.

```text
📁 netflix-ai-watch-spaces/
│
├── 📁 client/                         # React + Vite frontend
│   │
│   ├── 📁 public/                     # Public static assets
│   │
│   ├── 📁 src/
│   │   │
│   │   ├── 📁 api/
│   │   │   └── 📄 axios.js            # Axios API client
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── 📁 admin/              # Admin UI components
│   │   │   ├── 📁 layout/             # Navbar, hero, footer
│   │   │   ├── 📁 titles/             # Title-related components
│   │   │   ├── 📁 watchspace/         # Watch Space components
│   │   │   └── 📁 ui/                 # Reusable UI primitives
│   │   │
│   │   ├── 📁 context/
│   │   │   └── 📄 AuthContext.jsx     # Authentication context
│   │   │
│   │   ├── 📁 pages/
│   │   │   ├── 📁 admin/              # Admin pages
│   │   │   └── 📁 watchspace/         # Watch Space pages
│   │   │
│   │   ├── 📁 lib/
│   │   │   └── 📄 utils.js            # Shared utilities
│   │   │
│   │   ├── 📄 App.jsx                 # Application routes
│   │   ├── 📄 App.css                 # Component styling
│   │   ├── 📄 index.css               # Global styles and theme
│   │   └── 📄 main.jsx                # React application entry
│   │
│   ├── 📄 package.json
│   └── 📄 vite.config.js
│
├── 📁 server/                         # Node.js + Express backend
│   │
│   ├── 📁 src/
│   │   │
│   │   ├── 📁 config/                 # Database, environment,
│   │   │   │                          # OAuth and storage configuration
│   │   │   ├── 📄 db.js
│   │   │   ├── 📄 env.js
│   │   │   ├── 📄 minio.js            # Legacy filename; B2 SDK config
│   │   │   └── 📄 passport.js
│   │   │
│   │   ├── 📁 controllers/            # Request controllers
│   │   ├── 📁 middleware/             # Express middleware
│   │   ├── 📁 models/                 # Mongoose models
│   │   ├── 📁 routes/                 # REST API routes
│   │   ├── 📁 services/               # Business logic and AI services
│   │   ├── 📁 sockets/                # Socket.IO event handlers
│   │   ├── 📁 utils/                  # Shared backend utilities
│   │   │
│   │   ├── 📄 app.js                  # Express application
│   │   └── 📄 server.js               # Backend entry point
│   │
│   ├── 📁 scripts/                    # Seed and evaluation scripts
│   ├── 📁 test/                       # Backend tests
│   └── 📄 package.json
│
├── 📁 infra/
│   └── 📄 docker.compose.yaml         # Local MongoDB + legacy MinIO service
│
├── 📁 docs/                           # Project documentation
│   ├── 📄 architecture.md
│   ├── 📄 api-reference.md
│   ├── 📄 database-schema.md
│   ├── 📄 setup-guide.md
│   ├── 📄 deployment-guide.md
│   ├── 📄 socket-events.md
│   └── 📄 known-limitations-and-retrospective.md
│
├── 📄 .env.example                    # Environment template
├── 📄 .gitignore
└── 📄 README.md
```

> **Note:** This is a documentation-oriented overview of the main folders and known files, not a generated exhaustive filesystem listing. Some folders contain additional nested files and modules.

### Important Frontend Files

| File                                 | Responsibility                |
| ------------------------------------ | ----------------------------- |
| `client/src/main.jsx`                | React entry point             |
| `client/src/App.jsx`                 | Application routing           |
| `client/src/index.css`               | Global styling and theme      |
| `client/src/api/axios.js`            | API client and token handling |
| `client/src/context/AuthContext.jsx` | Authentication state          |
| `client/src/components/ui/`          | Reusable UI components        |
| `client/vite.config.js`              | Vite configuration            |

### Important Backend Files

| File                            | Responsibility                    |
| ------------------------------- | --------------------------------- |
| `server/src/server.js`          | Starts backend and Socket.IO      |
| `server/src/app.js`             | Express app and API registration  |
| `server/src/config/db.js`       | MongoDB connection                |
| `server/src/config/env.js`      | Environment validation            |
| `server/src/config/minio.js`    | B2-backed S3 client configuration |
| `server/src/config/passport.js` | OAuth configuration               |
| `server/src/sockets/index.js`   | Socket.IO initialization          |

---

## 💻 Prerequisites

Install the following tools before starting development.

| Software       | Requirement                            |
| -------------- | -------------------------------------- |
| Node.js        | Compatible with committed dependencies |
| npm            | Included with Node.js                  |
| Git            | Latest stable version                  |
| VS Code        | Recommended editor                     |
| Docker Desktop | Local MongoDB service                  |
| MongoDB        | Local Docker or MongoDB Atlas          |

You will also need credentials for the external services used by the application:

- Backblaze B2.
- Cloudflare Workers AI.
- Google OAuth.
- Facebook OAuth.
- Brevo.

---

## 📥 Clone the Repository

Open a terminal:

```bash
git clone https://github.com/bari199/netflix-ai-watch-spaces.git

cd netflix-ai-watch-spaces
```

Open the project in VS Code:

```bash
code .
```

---

## 🔐 Environment Configuration

The project uses a root-level environment file.

### Step 1: Create `.env`

Copy the example file:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

**Linux / macOS**

```bash
cp .env.example .env
```

### Step 2: Configure Backend Variables

The backend validates these required variables in `server/src/config/env.js`.

```env
# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27018/netflix_ai_watch_spaces

# Authentication
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Backblaze B2
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005
B2_BUCKET_NAME=netflix-ai-video
B2_APPLICATION_KEY_ID=your_b2_application_key_id
B2_APPLICATION_KEY=your_b2_application_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback

# Brevo Email
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email
BREVO_SENDER_NAME=Netflix AI Watch Spaces

# Cloudflare Workers AI
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_AI_MODEL=your_cloudflare_ai_model
CLOUDFLARE_AI_TIMEOUT_MS=15000
CLOUDFLARE_AI_GENERAL_MAX_TOKENS=your_configured_max_tokens
```

Use the actual credentials and model configured in your environment. The example values above are placeholders.

### Important Environment Notes

- `server/src/config/env.js` loads the root `.env` file in development.
- The backend listens on `PORT`, defaulting to `5000`.
- The environment validator requires the B2 variables shown above.
- The storage module is named `minio.js`, but its current implementation uses Backblaze B2 credentials and the AWS S3 SDK.
- The root `.env.example` contains legacy/duplicate names. Do not assume every example variable is consumed by the current runtime.
- `SERVER_PORT`, `MINIO_ENDPOINT` and `MINIO_BUCKET` should not be substituted for the actual runtime variables without changing the code.

Never commit your real `.env` file.

---

## 🗄️ Start MongoDB

The Compose file contains MongoDB and a legacy MinIO AIStor service.

For normal local development, start only MongoDB to avoid the MinIO license requirement.

From the repository root:

```bash
docker compose -f infra/docker.compose.yaml up -d mongodb
```

Check the container:

```bash
docker compose -f infra/docker.compose.yaml ps
```

Local MongoDB connection:

```env
MONGODB_URI=mongodb://127.0.0.1:27018/netflix_ai_watch_spaces
```

Stop MongoDB:

```bash
docker compose -f infra/docker.compose.yaml stop mongodb
```

> The Compose MinIO service is not required for the current B2-backed application configuration. It has a Windows-specific license mount and should not be started as a prerequisite for the B2 setup.

---

## ⚙️ Run the Backend

Open a terminal at the repository root:

```bash
cd server
```

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

The backend startup process:

1. Loads the root environment configuration.
2. Connects to MongoDB.
3. Checks the configured B2 bucket.
4. Creates the HTTP server.
5. Initializes Socket.IO.
6. Starts listening on the configured port.

### Backend URLs

| Resource     | URL                                |
| ------------ | ---------------------------------- |
| API Base     | `http://localhost:5000/api`        |
| Health Check | `http://localhost:5000/api/health` |
| Socket.IO    | `http://localhost:5000`            |

A successful health check should report the API as running and MongoDB as connected.

---

## ⚛️ Run the Frontend

Open a second terminal at the repository root:

```bash
cd client
```

Install dependencies:

```bash
npm ci
```

### Configure Frontend Environment

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Start Vite

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend uses:

- `VITE_API_BASE_URL` for REST API requests.
- `VITE_SOCKET_URL` for Socket.IO connections.

The Axios client also uses credentialed requests and handles access-token refresh.

---

## 📦 Available Commands

### Frontend Commands

Run inside `client/`:

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start Vite development server |
| `npm run build`   | Build production assets       |
| `npm run preview` | Preview production build      |
| `npm run lint`    | Run ESLint                    |

### Backend Commands

Run inside `server/`:

| Command                            | Description                   |
| ---------------------------------- | ----------------------------- |
| `npm run dev`                      | Start backend in watch mode   |
| `npm start`                        | Start backend                 |
| `npm test`                         | Run Node.js test suite        |
| `npm run evaluate:recommendations` | Evaluate recommendation logic |
| `npm run test:b2`                  | Run B2 connection test        |
| `npm run seed:tron`                | Run Tron seed script          |
| `npm run seed:infinity-war`        | Run Infinity War seed script  |
| `npm run seed:endgame`             | Run Endgame seed script       |

---

## 🌐 Production Configuration

The project has separate frontend and backend deployments.

| Component           | Platform / URL                                               |
| ------------------- | ------------------------------------------------------------ |
| Frontend            | Vercel                                                       |
| Backend             | Render                                                       |
| Production Frontend | https://netflix-ai-watch-spaces-three.vercel.app             |
| Production Backend  | https://netflix-ai-watch-spaces-8zmq.onrender.com            |
| Production API      | https://netflix-ai-watch-spaces-8zmq.onrender.com/api        |
| Health Check        | https://netflix-ai-watch-spaces-8zmq.onrender.com/api/health |

### Vercel Environment Variables

```env
VITE_API_BASE_URL=https://netflix-ai-watch-spaces-8zmq.onrender.com/api

VITE_SOCKET_URL=https://netflix-ai-watch-spaces-8zmq.onrender.com
```

### Render Environment Variables

Configure the backend's production environment variables:

- `NODE_ENV=production`
- `PORT` (provided by Render)
- `CLIENT_URL` (exact Vercel frontend origin)
- `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- B2 credentials
- Google and Facebook OAuth credentials
- Cloudflare Workers AI credentials
- Brevo credentials

Use production OAuth callback URLs and production credentials.

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed

Check:

1. Docker MongoDB container is running.
2. Port `27018` is available.
3. `MONGODB_URI` is correct.
4. MongoDB is reachable from the backend.

### B2 Bucket Error

Check:

1. `B2_ENDPOINT` is correct.
2. `B2_REGION` matches your bucket region.
3. `B2_BUCKET_NAME` exists.
4. Application Key ID and Application Key have the required permissions.

### Frontend API Error

Check:

1. Backend is running on port `5000`.
2. `VITE_API_BASE_URL` is correct.
3. Frontend environment variables are loaded.
4. Browser console and Network tab for failed requests.

### CORS Error

Check the backend's `CLIENT_URL`:

```env
CLIENT_URL=http://localhost:5173
```

The Express application allows the local frontend origin and the configured client origin.

### Socket.IO Connection Error

Check:

1. Backend Socket.IO server is running.
2. `VITE_SOCKET_URL` points to the backend origin.
3. Authentication token is valid.
4. Production hosting supports WebSocket connections.

### OAuth Error

Check:

- Client ID and secret.
- Callback URL.
- OAuth provider's registered redirect URL.
- Backend environment configuration.

---

## 🔒 Security Checklist

- [ ] Never commit `.env`.
- [ ] Use strong access and refresh token secrets.
- [ ] Keep B2 application keys private.
- [ ] Restrict OAuth redirect URLs.
- [ ] Configure production `CLIENT_URL`.
- [ ] Use HTTPS in production.
- [ ] Keep Cloudflare and Brevo credentials private.
- [ ] Do not expose backend secrets in frontend environment variables.

---

## 📚 Related Documentation

| Document                                                    | Description                                |
| ----------------------------------------------------------- | ------------------------------------------ |
| [Architecture](architecture.md)                             | System architecture and technical design   |
| [API Reference](api-reference.md)                           | REST API endpoints                         |
| [Database Schema](database-schema.md)                       | MongoDB models and relationships           |
| [Socket Events](socket-events.md)                           | Real-time event reference                  |
| [Deployment Guide](deployment-guide.md)                     | Production deployment                      |
| [Known Limitations](known-limitations-and-retrospective.md) | Technical considerations and retrospective |

---

<p align="center">
  <strong>Netflix AI Watch Spaces</strong><br/>
  Built with React, Node.js, MongoDB, Socket.IO and Cloudflare Workers AI.
</p>
