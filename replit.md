# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Lara Web App

A Facebook multi-tool suite clone (Lara v1.5.1) running at `/lara/`.

### Architecture

- **Frontend**: React + Vite at `artifacts/lara-web/` (serves at `/lara/`)
- **Backend API**: Express + TypeScript at `artifacts/api-server/` (serves at `/api/`)
- **FB Helper**: Python script at `artifacts/api-server/fb_helper.py` — handles all Facebook API calls

### Why Python for FB calls

Facebook returns compressed/empty responses to server IPs when using `node-fetch`. Python's `requests` library handles gzip, redirects, and cookies correctly. The Node.js API server spawns `fb_helper.py` as a child process via `child_process.spawn`.

### Facebook API Architecture

All FB operations go through `artifacts/api-server/fb_helper.py` which:
1. Parses cookies (Netscape format OR raw `key=value; key=value` string)
2. Validates `c_user` + `xs` presence
3. Attempts multiple fallback methods for each operation
4. Returns JSON to stdout (read by Express)

### Endpoints

- `POST /api/fb/login` — validate cookie, extract UID/profile/avatar
- `POST /api/fb/react` — add reaction (LIKE/LOVE/HAHA/WOW/SAD/ANGRY/CARE)
- `POST /api/fb/share` — share post N times
- `POST /api/fb/comment` — bulk comment on post
- `POST /api/fb/token` — extract EAAG access token
- `POST /api/fb/guard` — enable/disable profile guard

### Cookie Behavior

- With valid cookies (real c_user+xs+datr+fr+sb from an active session): fb_dtsg is extracted, actions work
- With invalid/fake cookies: UID extracted from c_user, name shows as "User {uid}", actions fail with clear error logs
- Profile avatar always uses `graph.facebook.com/{uid}/picture?type=large` (302 redirect confirmed working)

### Cookie Formats Supported

```
# Netscape format (tab-separated, from browser extensions):
.facebook.com  TRUE  /  TRUE  0  c_user  61585216322349
.facebook.com  TRUE  /  TRUE  0  xs      abc:def:2:ghi:123

# Raw format:
c_user=61585216322349; xs=abc:def; datr=xyz; fr=abc; sb=def

# Newline-separated:
c_user=61585216322349
xs=abc:def:2:ghi:123
```

### Critical Facebook GraphQL Doc IDs (live, confirmed 2025-05)

These are real Relay persisted query IDs discovered via FB's `rsrcMap` + deferred module registry:

| Operation | Doc ID | Notes |
|---|---|---|
| `CometUFIFeedbackReactMutation` | `27045420388428225` | Reaction mutation — bundle hash `3dbKC66` |
| `useCometUFICreateCommentMutation` | `26613344231661138` | Comment mutation |

**Reaction Type IDs** (from `CometUFIReactionsColors` bundle):
- LIKE: `1635855486666999`
- LOVE: `1678524932434102`
- HAHA: `115940658764963`
- WOW: `908563459236466`
- ANGRY: `444813342392137`
- CARE: `613557422527858`

**How doc_id discovery works** (`_find_react_doc_id`):
1. Parse all `rsrcMap` entries from FB home page inline scripts → short-hash → CDN URL map
2. Parse all deferred module registrations (`"CometUFI*":{"r":[hashes]}`) → module → bundle hashes
3. Fetch each bundle and search for `CometUFIFeedbackReactMutation_facebookRelayOperation` export
4. Result cached 1 hour. Falls back to `_KNOWN_REACT_DOC_IDS` list.

**Real compound feedback_id** must be extracted from the post page HTML (regex `"feedback_id":"(ZmVlZGJhY2s6[...])"`), NOT simple `base64("feedback:POST_ID")`.

### Reaction Variables Format (WORKING — verified 2025-05)

```json
{
  "input": {
    "client_mutation_id": "random",
    "actor_id": "UID",
    "feedback_id": "ZmVlZGJhY2s6...compound...",
    "feedback_reaction_id": "1635855486666999",
    "action": "ADD_REACTION",
    "useDefaultActor": false,
    "reaction_style": null
  }
}
```
