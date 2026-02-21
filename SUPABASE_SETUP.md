# Supabase Setup — cracked.ai

This document is the single source of truth for connecting to the cracked.ai Supabase backend. Any Claude Code instance or developer can use this to connect.

---

## Project Details

| Field | Value |
|-------|-------|
| **Project name** | cracked.ai |
| **Project ID** | `vzjxalakudkqovfygmjw` |
| **Region** | us-east-1 |
| **Organization** | Zenyi1's (`oqqgeklciqqgytttyxre`) |
| **Dashboard** | https://supabase.com/dashboard/project/vzjxalakudkqovfygmjw |
| **DB host** | `db.vzjxalakudkqovfygmjw.supabase.co` |

---

## API Keys

| Key | Value |
|-----|-------|
| **URL** | `https://vzjxalakudkqovfygmjw.supabase.co` |
| **Anon key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anhhbGFrdWRrcW92ZnlnbWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODMzMDUsImV4cCI6MjA4NzI1OTMwNX0.spYy0pfwh2wNxxBeNsyj1hMzDlo-pk9wRdJcYInJRWI` |
| **Service role key** | Get from dashboard: Settings → API → `service_role` (secret — never commit) |

---

## Connecting a New Instance (Claude Code / Developer)

### 1. MCP (Claude Code)

The `.mcp.json` is already committed. Claude Code will auto-connect to Supabase MCP when you open the project. Use project ID `vzjxalakudkqovfygmjw` in all MCP tool calls.

### 2. Local .env.local

```bash
cp .env.local.example .env.local
```

Then fill in `SUPABASE_SERVICE_ROLE_KEY` from the dashboard link above.

The URL and anon key are pre-filled in the example file.

### 3. Supabase CLI (optional, for edge functions)

```bash
npx supabase login
npx supabase link --project-ref vzjxalakudkqovfygmjw
```

---

## Database Schema

Migrations are in `supabase/migrations/` and have already been applied to the live project.

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | All 6 tables: founders, founder_profiles, candidates, candidate_profiles, match_scores, connections |
| `002_rls_policies.sql` | Row Level Security for all tables |

### Tables

| Table | RLS | Description |
|-------|-----|-------------|
| `founders` | ✅ | Founder user profiles |
| `founder_profiles` | ✅ | Structured output of founder interview |
| `candidates` | ✅ | Candidate user profiles |
| `candidate_profiles` | ✅ | Interview scores + summaries |
| `match_scores` | ✅ | Precomputed founder↔candidate match data |
| `connections` | ✅ | When a founder initiates contact |

### RLS Summary

- **Founders** — see/edit only their own row
- **Founder profiles** — founder sees only their own profiles
- **Match scores** — founder sees matches for their profiles; candidates cannot see scores
- **Candidates** — see/edit only their own row
- **Candidate profiles** — candidate sees/edits only their own
- **Connections** — founder has full access; candidate can view only

---

## Service Role Key Usage

Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code (API routes, edge functions, server actions). Never expose it client-side. It bypasses RLS — use it for:

- Matching engine writes to `match_scores`
- Admin triggers and edge functions
- Post-interview data extraction writes

---

## Status

- [x] Project created (2026-02-21)
- [x] Schema migrations applied
- [x] RLS policies applied
- [x] Security advisors: clean
- [ ] Auth providers configured (configure in dashboard → Authentication → Providers)
- [ ] Edge function `match-on-interview` deployed
