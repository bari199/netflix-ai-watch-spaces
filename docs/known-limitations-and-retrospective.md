# Known Limitations and Project Retrospective

<p align="center">
  <img src="https://img.shields.io/badge/Project-Netflix%20AI%20Watch%20Spaces-E50914?style=for-the-badge&logo=netflix&logoColor=white" alt="Project" />
  <img src="https://img.shields.io/badge/Architecture-MERN-47A248?style=for-the-badge" alt="MERN" />
  <img src="https://img.shields.io/badge/Real--Time-Socket.IO-010101?style=for-the-badge&logo=socket.io" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/AI-Cloudflare-F38020?style=for-the-badge&logo=cloudflare" alt="Cloudflare AI" />
</p>

## 1. Project Overview

Netflix AI Watch Spaces is a full-stack collaborative movie-watching platform designed to provide synchronized playback, real-time communication, AI-assisted scene understanding, interactive trivia, and collaborative narrative voting.

The project combines a modern MERN architecture with Socket.IO, MongoDB, S3-compatible object storage, and Cloudflare Workers AI.

The implementation focuses on real-time collaboration, playback synchronization, timeline-aware interactions, and a modular backend architecture.

## 2. Implemented Capabilities

The following capabilities are represented in the current repository implementation.

| Area                     | Implemented capability                                          | Repository evidence                                           |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Authentication           | JWT-based authentication and OAuth integration                  | Auth routes, middleware and Passport configuration            |
| Watch Spaces             | Watch Space creation and management                             | WatchSpace model and related API modules                      |
| Real-time communication  | Socket.IO connection and room handlers                          | `server/src/sockets/`                                         |
| Playback synchronization | Host-authoritative playback position and drift correction logic | `server/src/sockets/playback.socket.js`                       |
| Playback recovery        | Host position tracking and playback progress persistence logic  | Playback socket handlers                                      |
| Chat                     | Persistent room messages and chat activity                      | ChatMessage model and chat handlers                           |
| AI interaction           | Timeline-aware AI question and retrieval modules                | `server/src/services/ai/`                                     |
| Trivia                   | Timeline-triggered trivia events                                | `triggerDueTriviaEvents()`                                    |
| Narrative voting         | Automatic variation voting and scheduled application logic      | Variation socket handlers                                     |
| Analytics                | Watch Space session analytics service                           | `server/src/services/analytics.service.js`                    |
| Recommendations          | Recommendation implementation and evaluation script             | Recommendation services and `evaluate:recommendations` script |
| Media storage            | S3-compatible Backblaze B2 integration                          | `server/src/config/minio.js`                                  |
| Transactional email      | Brevo integration                                               | Email configuration and services                              |
| Deployment               | Separate frontend and backend deployment configuration          | Vercel and Render deployment                                  |

_This table describes repository implementation, not a claim that every feature has passed production end-to-end testing._

## 3. Technical Strengths

### 3.1 Host-Controlled Playback Architecture

The playback implementation uses an authoritative host position rather than treating every participant's playback position as independent.

Relevant implementation details:

- Host playback position tracking.
- Playback synchronization and drift correction logic.
- A configured drift threshold of 0.25 seconds.
- Host disconnect handling.
- Playback progress persistence and retry logic.
- Validation of playback positions against title duration.

The `DRIFT_THRESHOLD_SECONDS` constant in `playback.socket.js` is set to `0.25`.

This is an implementation threshold, not a measured guarantee of 250 ms end-to-end synchronization.

### 3.2 Timeline-Aware AI and Interactive Events

The platform connects movie timeline metadata with AI-assisted interactions and playback events.

Implemented areas include:

- Timeline-based AI retrieval.
- AI question handling.
- Playback-triggered trivia events.
- Automatic variation voting.
- Scheduled application of winning variation options.
- Subtitle and timeline-related metadata support.

Trivia event handling validates timeline event data, checks playback marker crossings, records triggered event IDs, and emits room events to connected participants.

### 3.3 Session Analytics

Analytics functionality is implemented in:

- `server/src/services/analytics.service.js`
- `server/src/controllers/analytics.controller.js`
- `server/src/routes/analytics.routes.js`

The current analytics service derives:

| Metric            | Current implementation                       |
| ----------------- | -------------------------------------------- |
| Session duration  | Calculated from `startedAt` and `endedAt`    |
| Peak participants | Uses stored peak count and participant count |
| AI questions      | Reads `aiQuestionsAsked`                     |
| Trivia events     | Counts stored triggered trivia event IDs     |
| Chat activity     | Counts ChatMessage documents                 |

Analytics access is restricted to the Watch Space host in the service implementation.

The accuracy of each metric should be validated against completed sessions and actual user activity before presenting it as a production-verified measurement.

### 3.4 Modular Backend Design

The backend separates responsibilities into:

- Configuration
- Database models
- Controllers
- API routes
- Middleware
- Business services
- Socket.IO handlers
- Automated tests

This separation makes the project easier to maintain, debug, and extend without introducing another backend framework.

### 3.5 Cloud-Based Media and AI Services

The current storage configuration uses Backblaze B2 through the AWS S3-compatible SDK.

Cloudflare Workers AI provides the AI integration, while Brevo supports transactional email.

The production architecture also separates frontend hosting from the backend API and real-time Socket.IO server.

## 4. Current Technical Considerations

These are engineering considerations identified through repository inspection. They should not be interpreted as evidence that the application is failing.

| Area                      | Current observation                                                                                               | Recommended improvement                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Socket.IO scaling         | Some playback and event tracking state uses in-memory Maps                                                        | Introduce shared state if multi-instance scaling is required           |
| Vote lifecycle            | Vote state is persisted, while some timer coordination is process-local                                           | Verify recovery and ownership across reconnects and multiple instances |
| Playback synchronization  | A 0.25-second drift threshold is configured                                                                       | Measure actual browser-to-browser drift                                |
| Socket.IO CORS            | Socket server currently uses wildcard origin configuration                                                        | Restrict allowed production origins                                    |
| Storage naming            | Some configuration filenames and function names retain MinIO terminology although the S3 client uses B2 variables | Align naming in a future cleanup                                       |
| Docker Compose            | Local Compose configuration includes MongoDB and MinIO AIStor                                                     | Document local infrastructure separately from production storage       |
| Environment configuration | Runtime-required variables and example configuration need to remain aligned                                       | Validate the example against `server/src/config/env.js`                |
| Variation service         | `server/src/services/ai/variation.service.js` is currently empty                                                  | Confirm whether it is required before implementing additional logic    |

## 5. Testing and Performance Verification

The repository contains a backend automated test suite under `server/test/`.

Run the backend tests:

```bash
cd server
npm test
```

Build the frontend:

```bash
cd client
npm run build
```

Run frontend linting:

```bash
cd client
npm run lint
```

## Performance Acceptance Criteria

The project is designed to meet the following performance acceptance targets under normal operating conditions.

| Metric                         | Acceptance Target | Project Status |
| ------------------------------ | ----------------: | -------------- |
| Normal API P95 latency         |          < 200 ms | Target Defined |
| AI response P95 latency        |       < 3 seconds | Target Defined |
| Playback synchronization drift |          < 250 ms | Target Defined |
| Socket event delivery          |          < 500 ms | Target Defined |
| Trivia marker delivery         |        < 1 second | Target Defined |

### Performance Assessment

The application architecture and implementation are designed around these performance objectives. The targets provide measurable acceptance criteria for API responsiveness, AI interaction, synchronized playback, real-time communication, and timeline-triggered events.

Final numerical performance results should be established through controlled testing under the expected deployment conditions.

### Recommended End-to-End Verification

1. Connect two or more authenticated browser sessions to the same Watch Space.
2. Verify host-controlled play, pause, and seek behavior.
3. Verify participant synchronization after reconnect.
4. Test host disconnection and room-state consistency.
5. Test chat messages, reactions, and message history.
6. Verify AI answers against the relevant timeline metadata.
7. Verify trivia events at their configured playback timestamps.
8. Test manual and automatic variation voting.
9. Verify winning variation application at the configured timestamp.
10. Verify analytics against actual session activity.

For every verification run, record the date, commit SHA, environment, result, and supporting evidence.

## 6. Production Architecture Considerations

The project uses a distributed deployment structure:

- Frontend: Vercel.
- Backend REST API: Render.
- Real-time communication: Socket.IO on the backend server.
- Application database: MongoDB.
- Media storage: Backblaze B2.
- AI inference: Cloudflare Workers AI.
- Transactional email: Brevo.

Important operational considerations:

- Production environment variables must be configured in the relevant hosting platforms.
- Database and storage credentials must remain private.
- Socket.IO connections must use the correct production origin.
- Multi-instance deployment requires shared coordination for process-local real-time state.
- Media access permissions and public/private URL behavior should be verified.

## 7. Security and Reliability Improvements

The following improvements are recommended as production-readiness work:

- Restrict Socket.IO CORS origins.
- Verify authentication and room membership for all protected socket events.
- Test host-only playback and Watch Space management permissions.
- Review access control for private Watch Spaces.
- Keep JWT secrets and external service credentials out of source control.
- Validate environment variables before application startup.
- Test reconnect, duplicate event, and concurrent voting scenarios.
- Verify media access permissions and upload constraints.

These are improvement and verification areas, not claims of known security incidents.

## 8. Project Retrospective

### What the Project Demonstrates

Netflix AI Watch Spaces demonstrates the integration of several full-stack engineering concepts in one application:

- MERN-based application development.
- Real-time communication using Socket.IO.
- Host-controlled playback synchronization.
- MongoDB data modelling and persistence.
- Timeline-aware AI interaction.
- Retrieval-based content understanding.
- Collaborative voting and interactive events.
- Session analytics.
- S3-compatible cloud media storage.
- Third-party OAuth and email integrations.
- Separate frontend and backend deployment.

### Engineering Lessons

1. Real-time applications need an authoritative source of state.
2. Playback synchronization requires both server-side logic and multi-client verification.
3. Persisted state and process-local state have different recovery and scaling characteristics.
4. AI responses become more useful when grounded in structured timeline metadata.
5. Analytics should be derived from reliable application events and validated against real sessions.
6. Deployment configuration must match the actual production infrastructure.
7. Automated tests and end-to-end verification provide different kinds of confidence.

### Future Improvements

Potential improvements include:

- Shared state management for horizontally scaled Socket.IO servers.
- More comprehensive multi-browser playback verification.
- Measured API, AI, and real-time performance reports.
- Expanded analytics validation and reporting.
- Improved recommendation evaluation with recorded Precision@5 results.
- Centralized observability and structured logging.
- More complete recovery testing for voting and playback state.
- Automated deployment and infrastructure validation.

## 9. Project Status

Netflix AI Watch Spaces has a substantial implementation across its frontend, backend, real-time communication, AI integration, analytics, and media-storage layers.

The repository demonstrates the core architecture and several important application workflows.

The remaining work is primarily focused on:

- End-to-end verification.
- Performance measurement.
- Security and scaling review.
- Documentation consistency.
- Production-readiness improvements.

**Final assessment:** The project provides a practical demonstration of full-stack development, real-time system design, AI integration, and cloud deployment. Final reliability and performance claims should be supported by recorded test results and deployment evidence.
