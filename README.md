# cracked.ai

**Matching founders with exceptional engineering talent — through AI-powered voice interviews.**

---

## The Problem

Europe's best engineers are sitting on the sidelines. Founders who need their first technical hire are burning weeks on LinkedIn, take-home challenges, and leetcode filters that measure the wrong things. The talent exists. The demand exists. The matching layer is broken.

FounderMatch fixes that.

---

## How It Works

### For Founders
A 5-minute voice interview replaces the job description. An AI interviewer extracts exactly what you need: required skills, experience level, work arrangement, culture fit, and deal-breakers. No forms. No boilerplate. Just a conversation.

### For Candidates
A two-phase voice interview — behavioral first, then a dynamically generated system design question tailored to your actual skills and the real problems matching founders are building. No LeetCode. No generic questions. Real signal.

### Matching
After both sides complete their interviews, a deterministic scoring engine computes weighted match scores across skills, experience, culture, and technical performance. Founders control the weights. The dashboard updates in real time.

When a founder finds their match, one click sends a mutual intro email to both parties.

---

## Architecture

```
Founder Interview (Voice AI)
  └─ Vapi Web SDK → Vapi Cloud (STT → Claude → TTS)
  └─ End-of-call webhook → Claude extracts structured profile → Supabase

Candidate Interview — Phase 1: Behavioral (Voice AI)
  └─ Vapi call → transcript → Claude extracts skills

Between Phases (server-side, ~10s)
  └─ Claude generates contextual system design question
     based on candidate skills + matching founder requirements

Candidate Interview — Phase 2: System Design (Voice AI)
  └─ Generated question baked into system prompt → Vapi call
  └─ Claude evaluates both transcripts → scores saved to Supabase

Matching Engine (deterministic, no AI)
  └─ Weighted sub-scores: skills, experience, culture, technical
  └─ Founder-controlled weights (must sum to 100)
  └─ Upsert to match_scores → Supabase Realtime → Dashboard
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes + Server Actions |
| Database & Auth | Supabase (Postgres, Auth, RLS, Edge Functions, Realtime) |
| Voice AI | Vapi.ai (STT, TTS, Claude orchestration via WebRTC) |
| LLM | Claude (Anthropic) — interviews, extraction, evaluation, question generation |
| Email | Resend |
| Deployment | Vercel |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Vapi](https://vapi.ai) account
- An [Anthropic](https://console.anthropic.com) API key
- A [Resend](https://resend.com) account

### 1. Clone and install

```bash
git clone <repo-url>
cd cracked.ai
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vapi
VAPI_API_KEY=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@foundermatch.com
```

### 3. Run database migrations

```bash
npx supabase db push
```

Or run `supabase/migrations/001_initial_schema.sql` directly in the Supabase SQL editor.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Design Decisions

**Why voice interviews instead of forms?**
Forms produce polished, rehearsed answers. Voice conversations surface how people actually think. Founders articulate needs they wouldn't have written down. Candidates reveal depth (or lack of it) that a resume never would.

**Why two-phase candidate interviews?**
Phase 1 (behavioral) builds a profile. Phase 2 (system design) validates it. The system design question is generated fresh for each candidate based on their stated skills and what matching founders are actually building — so it can't be googled or prepared for.

**Why deterministic matching instead of AI?**
AI is used where it adds value: conducting interviews, extracting structure, evaluating answers. For ranking, transparent math beats a black box. Founders see exactly why a candidate scored how they did, and can adjust weights to reflect what they actually care about.

**Why no scores shown to candidates?**
Candidates who can see their scores will optimize for them. Founders get cleaner signal when candidates are just being themselves.

---

## Project Structure

```
app/
  (auth)/           — login, signup, onboarding (role selection)
  founder/
    interview/      — voice interview UI
    dashboard/      — ranked candidate cards, connect flow
  candidate/
    interview/      — two-phase voice interview UI
  api/
    interview/      — Vapi end-of-call webhook handlers
    matching/       — scoring engine trigger + weight updates
    connect/        — connection creation + intro emails

lib/
  supabase/         — client, server, middleware
  vapi/             — Web SDK wrapper, assistant configs
  interview/        — prompts, extraction, evaluation, question generation
  matching/         — deterministic scoring engine
  email/            — Resend templates (founder intro, candidate intro)

supabase/
  migrations/       — initial schema
  functions/        — match-on-interview edge function
```
