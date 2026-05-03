# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod, `drizzle-zod`
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## RPW BOOSTER — Facebook Multi-Tool Suite

Running at `/lara/`. Branding: **RPW BOOSTER v1.5.1** with Zap icon, Monokai Toolkit dark theme, purple-pink gradients, dark/light mode toggle in navbar.

### Architecture

- **Frontend**: React + Vite at `artifacts/lara-web/` (serves at `/lara/`)
- **Backend API**: Express + TypeScript at `artifacts/api-server/` (serves at `/api/`)
- **FB Helper**: Python script at `artifacts/api-server/fb_helper.py` — all Facebook calls
- **Database**: PostgreSQL via `lib/db` — `fb_accounts` table for saved cookies

### Frontend Structure

- `App.tsx` — Layout with top navbar + slide-out sidebar (Sidebar.tsx) + per-tool routing
- `components/Sidebar.tsx` — Slide-out drawer with all tool links + account count badge
- `components/LogWindow.tsx` — Auto-scrolling log viewer for Python output
- `pages/LoginPage.tsx` — RPW BOOSTER branding, cookie input, field detector
- `pages/PanelPage.tsx` — Dashboard: profile hero, saved accounts stats, tool grid
- `pages/ReactPage.tsx` — Reaction booster with toggle for "boost all accounts"
- `pages/CommentPage.tsx` — Comment booster with texts×repeats customization
- `pages/SharePage.tsx` — Share booster
- `pages/TokenPage.tsx` — EAAG token extractor with copy button
- `pages/GuardPage.tsx` — Profile guard toggle

### Backend Endpoints

- `POST /api/fb/login` — validate cookie, save account to DB, return profile
- `POST /api/fb/react` — react with single cookie
- `POST /api/fb/react/all` — react using ALL active saved accounts from DB
- `POST /api/fb/share` — share post N times
- `POST /api/fb/comment` — comment with single cookie (count = texts × repeats)
- `POST /api/fb/comment/all` — comment using ALL active saved accounts from DB
- `POST /api/fb/token` — extract EAAG access token
- `POST /api/fb/guard` — enable/disable profile guard
- `GET /api/fb/accounts` — list all saved accounts
- `PATCH /api/fb/accounts/:uid` — toggle active status

### Database Schema (`lib/db/src/schema/fb_accounts.ts`)

```sql
fb_accounts (id, uid UNIQUE, name, avatar, cookie TEXT, active BOOL, last_used, created_at)
```

- Accounts saved permanently on login via `saveAccount()` upsert
- All active accounts used for bulk react/comment via `getActiveCookies()`
- Toggle individual accounts active/inactive via `toggleAccount(uid, active)`

### Python Helper Actions (`fb_helper.py`)

Single-cookie actions: `login`, `react`, `share`, `comment`, `token`, `guard`
Bulk actions (take `cookies: list`): `react_all`, `comment_all`

### Reaction Bug Fix (v1.5.1)

**Root cause**: `_REACT_DOC_CACHE["fb_id"]` was a global dict — different posts shared the same cached feedback_id, causing reactions to go to the wrong post silently.

**Fix**: `_FB_ID_CACHE: dict = {}` keyed by `post_url`. Each post URL gets its own feedback_id cached independently. `_extract_compound_feedback_id` and `_react_graphql` both updated to use per-post caching.

### Cookie Format Support

```
# Netscape format (tab-separated):
.facebook.com  TRUE  /  TRUE  0  c_user  61585216322349

# Raw inline format:
c_user=61585216322349; xs=abc:def; datr=xyz; fr=abc; sb=def
```

### Critical Facebook GraphQL Doc IDs (live, confirmed 2025-05)

| Operation | Doc ID |
|---|---|
| `CometUFIFeedbackReactMutation` | `27045420388428225` |
| `useCometUFICreateCommentMutation` | `26613344231661138` |

**Reaction Type IDs**: LIKE=`1635855486666999`, LOVE=`1678524932434102`, HAHA=`115940658764963`, WOW=`908563459236466`, ANGRY=`444813342392137`, CARE=`613557422527858`
