# DevCollab

Real-time developer collaboration platform — project spaces, real-time chat, Kanban boards,
code-snippet sharing, and an activity feed. (mini Slack + Trello + GitHub Discussions)

**Stack:** Next.js (App Router) + Spring Boot 3.5 (Java 24) + PostgreSQL + Redis.
Spring owns auth (Spring Security + JWT), REST, and real-time (WebSocket/STOMP).
Postgres + Storage are hosted on Supabase in production; local dev uses Docker.

See the full implementation plan in `~/.claude/plans/` for architecture and phased roadmap.

## Repository layout

```
backend/    Spring Boot API (Gradle, Kotlin DSL)
frontend/   Next.js app (TypeScript, Tailwind, App Router)
docker-compose.yml   Local Postgres + Redis
```

## Prerequisites

- Java 24, Docker
- Node 20+ (this machine: use `/opt/homebrew/bin` first on PATH — the Intel Homebrew Node is broken)

## Quickstart (local dev)

```bash
# 1. Copy env and adjust as needed
cp .env.example .env

# 2. Start Postgres + Redis
docker compose up -d

# 3. Backend (http://localhost:8080, Swagger at /swagger-ui.html)
cd backend && ./gradlew bootRun

# 4. Frontend (http://localhost:3000)
cd frontend && npm run dev
```

Health check: `curl http://localhost:8080/api/ping`

## Roadmap (phased)

- **Phase 0** — scaffolding, schema (Flyway), config ✅
- **Phase 1** — Auth, Project Spaces, Real-time Chat, Kanban
- **Phase 2** — Code Snippets, Activity Feed
- **Phase 3** — Presence, Typing, Notifications, Search, Rate limiting, Polish
