# Server

Express.js REST API and Socket.io real-time gateway. Separate route handlers, business logic, Mongoose models, middleware, and AI Content Engine modules by responsibility without introducing another backend framework.

JavaScript implementation, following the PRD.

server/
│
├── src/
│ │
│ ├── config/
│ │ ├── db.js
│ │ ├── env.js
│ │ └── minio.js
| | |** brevo.js
| | |** passport.js
│ │
│ ├── models/
│ │ ├── User.js
│ │ ├── Title.js
│ │ ├── WatchSpace.js
│ │ ├── ChatMessage.js
│ │ └── Interaction.js
│ │
│ ├── controllers/
| | |\_\_ user.controller.js
│ │ ├── auth.controller.js
│ │ ├── title.controller.js
│ │ ├── watchSpace.controller.js
│ │ ├── recommendation.controller.js
│ │ └── analytics.controller.js
│ │
│ ├── routes/
│ │ ├── auth.routes.js
│ │ ├── title.routes.js
│ │ ├── watchSpace.routes.js
│ │ ├── recommendation.routes.js
│ │ └── analytics.routes.js
| | |\_\_ user.routes.js
│ │
│ ├── middleware/
│ │ ├── auth.middleware.js
│ │ ├── role.middleware.js
│ │ ├── error.middleware.js
│ │ └── validate.middleware.js
│ │
│ ├── services/
│ │ ├── auth.service.js
│ │ ├── watchSpace.service.js
│ │ ├── recommendation.service.js
│ │ ├── analytics.service.js
| | |\_\_ user.service.js
│ │ └── ai/
│ │ ├── timeline.service.js
│ │ ├── retrieval.service.js
│ │ ├── copilot.service.js
│ │ ├── trivia.service.js
│ │ └── variation.service.js
│ │
│ ├── sockets/
│ │ ├── index.js
│ │ ├── room.socket.js
│ │ ├── playback.socket.js
│ │ ├── chat.socket.js
│ │ └── presence.socket.js
│ │
│ ├── utils/
| | emailTemplates-/
| | verificationEmail.js
│ │
│ ├── app.js
│ └── server.js
│
├── tests/
├── package.json
└── .env.example
