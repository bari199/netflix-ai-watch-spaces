# Socket.IO Event Contract

Socket.IO is initialized on the same HTTP server as Express. The client connects to the backend origin and sends its access token as `handshake.auth.token`.

## Authentication and room access

- Connection middleware verifies JWT, loads the user and rejects missing/invalid tokens and admin accounts.
- A user must be a persisted Watch Space participant before `room.join` succeeds.
- Joined sockets enter `watchspace:<watchSpaceId>`.
- Room handlers check room membership and, where required, current database participation and host ownership.

## Room events

| Direction | Event | Purpose |
|---|---|---|
| Client → Server | `room.join` | Join room; callback returns role, playback mode/state and active vote |
| Client → Server | `room.leave` | Leave socket room without deleting database membership |
| Server → Client | `room.error` | Join/leave error when no callback is supplied |

## Playback/synchronization

| Direction | Event | Purpose |
|---|---|---|
| Client → Server | `playback.control` | Host play/pause/seek/buffering control |
| Client → Server | `room.playback.mode.update` | Host updates playback mode |
| Client → Server | `room.sync.ping` | Synchronization ping |
| Client → Server | `room.sync.report` | Client sync report |
| Server → Client | `room.playback.update` | Playback update |
| Server → Client | `room.playback.mode.changed` | Mode change |
| Server → Client | `room.sync.pong` | Ping response |
| Server → Client | `room.playback.position` | Position update |
| Server → Client | `room.sync.correction` | Drift correction |
| Server → Client | `room.ai.trivia` | Timeline trivia marker |
| Server → Client | `room.variation.applied` | Variation applied notification |

The server defines a 0.25-second drift threshold; this is an implementation constant, not measured end-to-end performance evidence.

## Chat and presence

| Direction | Event | Purpose |
|---|---|---|
| Client → Server | `chat.message.send` | Persist/broadcast message |
| Client → Server | `chat.message.edit` | Edit own message |
| Client → Server | `chat.message.delete` | Delete own message |
| Client → Server | `chat.history.get` | Read room chat history |
| Client → Server | `chat.typing` | Typing activity |
| Client → Server | `chat.reaction.add` | Add reaction |
| Server → Client | `chat.message.new` | New message |
| Server → Client | `chat.message.updated` | Edited message |
| Server → Client | `chat.message.deleted` | Deleted message |
| Server → Client | `chat.typing.update` | Typing status |
| Client → Server | `presence.get` | Request participant presence |
| Client → Server | `presence.join` | Presence join/update |
| Server → Client | `presence.updated` | Presence broadcast |

## Narrative variation voting

| Direction | Event | Purpose |
|---|---|---|
| Client → Server | `variation.vote.state.get` | Get active vote/playback state after join/reconnect |
| Client → Server | `variation.vote.start` | Host starts manual vote |
| Client → Server | `variation.vote.cast` | Participant casts or changes vote |
| Server → Client | `room.variation.voteOpen` | Vote opened |
| Server → Client | `room.variation.voteUpdate` | Vote count update |
| Server → Client | `room.variation.voteResult` | Winner and apply timestamp |
| Server → Client | `room.variation.applied` | Winning option applied |

Automatic voting starts a 60-second poll when playback crosses a configured timeline variation marker. The vote is persisted and clients can request current vote state after reconnect. Manual poll duration is configurable within server validation bounds.

## Payload conventions

- Room-scoped payloads include `watchSpaceId` where applicable.
- Handlers accept callbacks for success/failure; clients should use them for acknowledgement.
- Never trust a client-provided user ID. The server derives identity from the authenticated socket.
- The above list reflects event names in the current socket modules. Inspect handler source for exact payload shapes before implementing another client.
