# PassItOn

PassItOn is a campus-verified secondhand marketplace. Students can list useful items, discover affordable finds, reserve listings, review handoffs, and chat in real time.

## Architecture

```text
Browser (Vite + React)
        |
        | REST /api/* + Socket.IO
        v
Express API (Node.js)
  controllers -> services -> Mongoose models
        |                         |
        +---- Socket.IO           +---- MongoDB
```

- `frontend/` — Vite React single-page application.
- `backend/src/` — Express API, JWT authentication, services, models, and Socket.IO.
- `backend/test/` — isolated Node test suite with mocked persistence.
- `docker-compose.yml` — local backend and MongoDB orchestration.

The backend keeps controllers thin and puts business rules in services. REST and Socket.IO message delivery share the same message service, so messages sent by either transport are persisted consistently.

## Features

- College-email registration (`@lpu.co.in` and `@lpu.in`), email verification, login, and JWT-protected routes.
- Listing creation, search/filtering, update, deletion, reservations, reviews, and reports.
- Seller/buyer authorization for listings, reservations, conversations, and messages.
- Socket.IO authentication, conversation rooms, real-time messages, and recipient notifications.
- Modular duplicate-listing detection using title, description, category, and price similarity. Suspicious duplicates warn the seller; they are never deleted automatically.

## Requirements

- Node.js 22+
- npm
- MongoDB 7/8 (or Docker Desktop)

## Local setup

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env and set a strong JWT_SECRET and your MongoDB URI
npm run dev
```

The API runs at `http://localhost:5000` by default.

### Demo account (local testing)

Add the following to `backend/.env` before starting the backend:

```dotenv
SEED_DEMO_USER=true
DEMO_USER_EMAIL=demo@lpu.in
DEMO_USER_PASSWORD=DemoPass123!
```

The server creates a verified account if it does not already exist. Use those credentials on the login screen. For Docker, set the same variables in the PowerShell session before `docker compose up`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the local backend. For a deployed API, set `VITE_API_URL` in `frontend/.env`.

## Docker

From the repository root:

```powershell
$env:JWT_SECRET = "a-long-random-secret"
docker compose up --build
```

This starts MongoDB and the backend. MongoDB has a healthcheck, and the backend waits for it before starting. Configuration is injected at runtime; `.env` files and secrets are excluded from the image by `.dockerignore`.

Check the running API:

```powershell
Invoke-WebRequest http://localhost:5000/
```

Stop services with `docker compose down`. Add `-v` only when you intentionally want to remove the local MongoDB volume.

## API overview

All protected endpoints require `Authorization: Bearer <JWT>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/verify-email/:token` |
| Listings | `GET /api/listings`, `POST /api/listings`, `GET /api/listings/:id`, `PATCH /api/listings/:id`, `DELETE /api/listings/:id` |
| Duplicate check | `POST /api/listings/duplicate-check` |
| Reservations | `POST /api/reservations`, `GET /api/reservations`, `PATCH /api/reservations/:id/accept`, `PATCH /api/reservations/:id/reject`, `DELETE /api/reservations/:id` |
| Conversations | `POST /api/conversations`, `GET /api/conversations`, `GET /api/conversations/:id` |
| Messages | `GET /api/conversations/:id/messages`, `POST /api/conversations/:id/messages` |
| Users | `GET /api/users/me`, `PATCH /api/users/me` |
| Reviews | `POST /api/reviews`, `GET /api/reviews/user/:userId`, `DELETE /api/reviews/:id` |
| Reports | `POST /api/reports`, `GET /api/reports/me` |

## Real-time messaging

Connect Socket.IO with the JWT in `handshake.auth.token` (or a Bearer authorization header). Supported client events:

- `conversation:join` — `{ conversationId }`
- `conversation:leave` — `{ conversationId }`
- `message:send` — `{ conversationId, body }`

Server events are `message:new` for room participants and `notification:new` for the recipient. The socket layer validates conversation membership before joining or sending.

## Testing

Tests run without a MongoDB instance and use `.env.test`:

```powershell
cd backend
npm test
```

The suite covers JWT authentication, protected access, listing CRUD and authorization, reservations, and important failure cases.

## Security notes

- Never commit `.env`, `.env.test`, database credentials, or production JWT secrets.
- Replace the Compose fallback `JWT_SECRET` for every real deployment.
- Use HTTPS and a restricted Socket.IO CORS origin in production.
- Email verification is required before login.
