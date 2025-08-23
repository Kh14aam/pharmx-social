# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project type: Cloudflare Workers (TypeScript) API for PharmX Social, using Hono for routing, D1 for SQL storage, KV for sessions, R2 for media, and Durable Objects for realtime.

Quick commands
- Install dependencies (uses package-lock.json):
  ```bash path=null start=null
  npm ci
  ```
- Start local development (Wrangler dev):
  ```bash path=null start=null
  npm run dev
  ```
- Type-check (noEmit; no separate build step):
  ```bash path=null start=null
  npx tsc -p tsconfig.json --noEmit
  ```
- Tail production logs:
  ```bash path=null start=null
  npm run tail
  ```
- Deploy to Cloudflare:
  ```bash path=null start=null
  npm run deploy
  ```
- Lint/tests: not configured in this repo. There is no ESLint/Prettier or test runner; rely on TypeScript for static checks.

Environment and secrets
This worker relies on Cloudflare bindings and secrets configured via wrangler.toml and Wrangler secrets.
- Cloudflare bindings (from wrangler.toml):
  - D1: DB (database_name: pharmx-social-db)
  - KV: SESSIONS
  - R2: AVATARS
  - Durable Objects: MATCHMAKING_QUEUE (class MatchmakingQueue), CHAT_ROOMS (class ChatRoom)
- Vars present in wrangler.toml: ENVIRONMENT, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_ISSUER_BASE_URL, AUTH0_REDIRECT_URI, FRONTEND_URL
- Secrets required at runtime (set these before dev/deploy):
  ```bash path=null start=null
  npx wrangler secret put JWT_SECRET
  npx wrangler secret put AUTH0_CLIENT_SECRET
  ```
  Optional TURN creds for ICE if using Cloudflare TURN:
  ```bash path=null start=null
  npx wrangler secret put TURN_USERNAME
  npx wrangler secret put TURN_CREDENTIAL
  ```
- D1 quick checks (local vs remote):
  ```bash path=null start=null
  # Local dev database
  npx wrangler d1 execute pharmx-social-db --local --command "SELECT 1;"

  # Remote Cloudflare database (requires auth)
  npx wrangler d1 execute pharmx-social-db --remote --command "SELECT 1;"
  ```

Big-picture architecture
- Entry point (src/index.ts)
  - Sets up Hono app and CORS, exposes fetch handler.
  - Health check at /health (no auth).
  - API is mounted under /api/v1 and groups routes by domain: auth, profile, users, chats, upload.
  - Exposes a TURN credentials endpoint at /api/v1/turn-credentials.
  - For realtime signaling, forwards WebSocket requests to Durable Objects:
    - /match → MatchmakingQueue DO
    - /room/:roomCode → ChatRoom DO
- Authentication (src/middleware/auth.ts, src/routes/auth.ts)
  - Login flow redirects to Auth0 using domain/client-id from env.
  - Callback exchanges the authorization code for tokens, fetches userinfo, then issues an HS256 JWT signed with JWT_SECRET and stores a session record in KV (SESSIONS). Finally redirects to FRONTEND_URL with token and session ID.
  - Protected routes use verifyAuth middleware: expects Authorization: Bearer <JWT>; verifies with jose and injects userId/userEmail into request context.
- Persistence
  - D1 (DB) stores users, chats, messages, and related metadata. Queries are issued directly via c.env.DB.prepare(...).bind(...).run()/all()/first().
  - KV (SESSIONS) stores short-lived session blobs keyed by a random sessionId.
  - R2 (AVATARS) stores uploaded avatar files; user rows reference avatar_url and image_key.
- Media upload and serving (src/routes/upload.ts and src/routes/profile.ts)
  - Accepts multipart/form-data with file|avatar field; validates size/type; writes to R2 at avatars/{userId}/avatar.<ext> with HTTP metadata; updates D1 with avatar_url (served path) and image_key (R2 key).
  - Serves avatars from R2 via /api/v1/upload/avatars/:userId, with ETag-based caching and content-type preservation.
- Chats and messaging (src/routes/chats.ts)
  - REST endpoints to list chats, paginate messages, send a message, and create a new chat between two users; maintains last_message_id and updated_at on chats.
- Users and profiles (src/routes/users.ts, src/routes/profile.ts)
  - Profile endpoints to create/update a user; normalization helpers constrain gender and DOB formats; writes/reads via D1.
  - Users endpoints expose discovery, detail, and search by name/email.
- Realtime and WebRTC signaling (src/durable-objects)
  - MatchmakingQueue: WebSocket endpoint that queues users, emits queue updates, and pairs users into a room with a generated roomCode. On match, it tells each client the roomCode and role (initiator/responder).
  - ChatRoom: per-room Durable Object that upgrades to WebSocket, tracks two participants, and relays signaling messages (offer/answer/ice-candidate), simple text chat, mute-status, and end-call events. Handles disconnects and broadcasts state to peers.

Conventions and notes
- Module Worker + Hono: All endpoints are ESM; Node APIs are not available in the worker runtime. Use c.env for typed bindings (Env interface in src/index.ts).
- TypeScript configuration (tsconfig.json) enables strict mode and noEmit; Wrangler builds and deploys the worker directly from TypeScript.
- Durable Object classes are registered in wrangler.toml with a migration tag (v1) using SQLite-backed DO storage.

Minimal repo map (high-level)
- src/index.ts — Hono app composition, CORS, route mounting, DO forwarding, health and TURN endpoints
- src/middleware/auth.ts — JWT verification middleware
- src/routes/* — Route groups: auth, profile, users, chats, upload
- src/durable-objects/* — MatchmakingQueue and ChatRoom DO implementations
- wrangler.toml — Cloudflare bindings, vars, and DO migrations
- package.json — npm scripts (dev/deploy/tail); devDependency on Wrangler; TypeScript

