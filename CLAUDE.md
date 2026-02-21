# FounderMatch — Platform Specification

## Overview

A hiring platform that uses voice AI interviews (Deepgram) to match startup founders with candidates. Founders describe what they need; candidates get a tailored behavioral + system design interview. Founders see a ranked dashboard of potential hires and can trigger a mutual intro email.

---

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes + Server Actions
- **Database & Auth:** Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Voice AI:** Deepgram (STT/TTS) + Claude API (conversation orchestration)
- **Email:** Resend (transactional emails)
- **Deployment:** Vercel
- **State/Realtime:** Supabase Realtime (dashboard updates)

---

## Database Schema (Supabase / Postgres)

```sql
-- Founders (extend Supabase auth.users)
create table public.founders (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  company_name text not null,
  company_description text,
  website text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Founder interview results (what they're looking for)
create table public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id) on delete cascade not null,
  raw_transcript text not null,
  -- Structured extraction from Claude
  required_skills text[] default '{}',        -- e.g. ['typescript','react','postgres']
  preferred_skills text[] default '{}',       -- nice-to-haves
  role_title text,                            -- e.g. 'Senior Frontend Engineer'
  role_description text,                      -- summarized from interview
  experience_level text,                      -- 'junior' | 'mid' | 'senior' | 'lead'
  work_style text,                            -- 'remote' | 'hybrid' | 'onsite'
  culture_values text[],                      -- extracted soft requirements
  deal_breakers text[],                       -- hard nos
  interview_duration_sec int,
  created_at timestamptz default now()
);

-- Candidates (extend Supabase auth.users)
create table public.candidates (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  linkedin_url text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Candidate interview results
create table public.candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references public.candidates(id) on delete cascade not null,
  raw_transcript text not null,
  -- Phase 1: Behavioral — general profile
  skills text[] default '{}',
  experience_years int,
  experience_level text,
  strengths text[],
  work_style_preference text,
  behavioral_summary text,                    -- Claude-generated summary
  behavioral_score numeric(3,1),              -- 0-10
  -- Phase 2: System Design — technical depth
  system_design_question text,                -- the question that was asked
  system_design_summary text,                 -- Claude-generated eval
  system_design_score numeric(3,1),           -- 0-10
  overall_score numeric(3,1),                 -- weighted composite
  interview_duration_sec int,
  created_at timestamptz default now()
);

-- Match scores (precomputed for dashboard)
create table public.match_scores (
  id uuid primary key default gen_random_uuid(),
  founder_profile_id uuid references public.founder_profiles(id) on delete cascade,
  candidate_profile_id uuid references public.candidate_profiles(id) on delete cascade,
  skill_match_score numeric(3,1),             -- 0-10 how well skills align
  experience_match_score numeric(3,1),        -- 0-10 seniority fit
  culture_match_score numeric(3,1),           -- 0-10 soft factors
  technical_score numeric(3,1),               -- from candidate interview
  overall_match_score numeric(3,1),           -- weighted composite
  match_reasoning text,                       -- Claude-generated explanation
  created_at timestamptz default now(),
  unique (founder_profile_id, candidate_profile_id)
);

-- When a founder selects a candidate
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid references public.founders(id),
  candidate_id uuid references public.candidates(id),
  match_score_id uuid references public.match_scores(id),
  intro_email_sent_at timestamptz,
  status text default 'pending', -- 'pending' | 'sent' | 'accepted' | 'declined'
  created_at timestamptz default now(),
  unique (founder_id, candidate_id)
);
```

### Row Level Security (RLS)

```sql
-- Founders can only see their own data
alter table public.founders enable row level security;
create policy "founders_own" on public.founders
  for all using (auth.uid() = id);

-- Founders can see match scores for their profiles
alter table public.match_scores enable row level security;
create policy "founder_sees_matches" on public.match_scores
  for select using (
    founder_profile_id in (
      select id from public.founder_profiles where founder_id = auth.uid()
    )
  );

-- Candidates can only see their own profile (not scores/matches)
alter table public.candidates enable row level security;
create policy "candidates_own" on public.candidates
  for all using (auth.uid() = id);
```

---

## Architecture — Modules

### Module 1: Auth & Onboarding

**Path:** `/app/(auth)/`

- Supabase Auth with magic link or Google OAuth
- Role selection on first login: `founder` or `candidate`
- Inserts row into `founders` or `candidates` table accordingly
- Redirect to appropriate flow

**Key files:**
```
app/(auth)/login/page.tsx
app/(auth)/signup/page.tsx
app/(auth)/onboarding/page.tsx
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
```

---

### Module 2: Founder Interview (Voice AI)

**Path:** `/app/founder/interview/`

**Flow:**
1. Founder clicks "Start Interview"
2. Browser opens WebSocket to Deepgram for real-time STT
3. Claude API orchestrates the conversation (system prompt below)
4. Deepgram TTS speaks Claude's questions back
5. Interview lasts ~5-7 min, AI wraps up naturally
6. On end: full transcript → Claude extraction → save `founder_profiles` row

**Claude System Prompt (Founder Interview):**
```
You are interviewing a startup founder to understand their hiring needs.
Keep it conversational, ~5 minutes. Cover:
1. What role are you hiring for? Title and responsibilities.
2. Must-have technical skills (be specific: languages, frameworks, tools).
3. Nice-to-have skills.
4. Experience level needed and why.
5. Work arrangement (remote/hybrid/onsite).
6. Team culture and values — what kind of person thrives here?
7. Any deal-breakers?

Ask follow-up questions to get specifics. Don't accept vague answers
like "good communicator" — dig into what that means for them.
When you have enough info, thank them and wrap up.
```

**Claude Extraction Prompt (post-interview):**
```
Given this transcript of a founder interview, extract structured JSON:
{
  "required_skills": [...],
  "preferred_skills": [...],
  "role_title": "...",
  "role_description": "...",
  "experience_level": "junior|mid|senior|lead",
  "work_style": "remote|hybrid|onsite",
  "culture_values": [...],
  "deal_breakers": [...]
}
Be precise. Only include skills explicitly mentioned or clearly implied.
```

**Key files:**
```
app/founder/interview/page.tsx          -- interview UI
app/api/interview/founder/route.ts      -- websocket/orchestration
lib/deepgram/client.ts                  -- Deepgram STT/TTS helpers
lib/interview/founder-prompts.ts        -- system prompts
lib/interview/extract-founder.ts        -- Claude structured extraction
```

---

### Module 3: Candidate Interview (Voice AI — 2 Phases)

**Path:** `/app/candidate/interview/`

**Flow:**

#### Phase 1 — Behavioral (~3-5 min)
1. AI asks about background, experience, skills, work preferences
2. Goal: build a candidate profile (skills, strengths, level)
3. AI probes for depth — not just "I know React" but "tell me about a complex React project"

**Claude System Prompt (Candidate Behavioral):**
```
You are conducting a behavioral interview for a tech candidate.
Keep it conversational, ~4 minutes. Cover:
1. Walk me through your background briefly.
2. What technologies do you work with most? Get specific versions/tools.
3. Tell me about a challenging project. What was your role?
4. How do you approach debugging/problem-solving?
5. What's your preferred work style?
6. What are you looking for in your next role?

Dig deeper on technical claims. If they say "I know TypeScript",
ask about specific patterns, challenges, or projects.
Transition naturally to Phase 2 when you have enough.
```

#### Phase 2 — System Design (~3-5 min)
1. Based on Phase 1 profile + matching founder requirements, Claude generates a contextual system design question
2. The question tests real understanding, not memorized answers
3. AI follows up on their design with probing questions

**Question Generation Logic:**
```
Given:
- Candidate skills: [from phase 1]
- Matching founder requirements: [from founder_profiles where skills overlap]

Generate a system design question that:
1. Uses technologies the candidate claims to know
2. Is relevant to what matching founders are building
3. Tests architectural thinking, not trivia
4. Can be discussed in ~5 minutes
5. Has natural follow-up probes

Example: If candidate knows TypeScript + React + Postgres, and a founder
is building a real-time collaboration tool:
"Design the real-time sync layer for a collaborative document editor.
How would you handle conflict resolution and offline support?"
```

**After interview:**
- Full transcript → Claude evaluation → save `candidate_profiles` row
- Trigger matching pipeline (Module 5)

**Key files:**
```
app/candidate/interview/page.tsx
app/api/interview/candidate/route.ts
lib/interview/candidate-prompts.ts
lib/interview/question-generator.ts     -- contextual system design Q
lib/interview/evaluate-candidate.ts     -- Claude scoring
```

---

### Module 4: Founder Dashboard

**Path:** `/app/founder/dashboard/`

**Features:**
- Card grid of matched candidates, sorted by `overall_match_score`
- Each card shows:
  - Candidate name, experience level
  - Skill overlap (visual: matched skills highlighted)
  - Behavioral score, system design score, overall score
  - Claude-generated match reasoning (1-2 sentences)
  - "Connect" button
- Filter/sort by: score, skills, experience level
- Clicking a card expands to full profile view

**On "Connect" click:**
1. Insert into `connections` table
2. Trigger email via Resend to both parties
3. Card updates to show "Intro Sent" state

**Key files:**
```
app/founder/dashboard/page.tsx
app/founder/dashboard/candidate-card.tsx
app/founder/dashboard/candidate-detail.tsx
app/api/connect/route.ts                    -- handles connection + email
lib/email/templates/intro-email.tsx          -- React Email template
```

---

### Module 5: Matching Engine

**Triggered:** After each candidate interview completes.

**Steps:**
1. Load all `founder_profiles`
2. For each founder profile, compute match score against new candidate
3. Use Claude for nuanced matching (not just keyword overlap)

**Claude Matching Prompt:**
```
Given a founder's requirements and a candidate's profile, score the match.

Founder wants: { ...founder_profile }
Candidate has: { ...candidate_profile }

Return JSON:
{
  "skill_match_score": 0-10,       // how well hard skills align
  "experience_match_score": 0-10,  // seniority fit
  "culture_match_score": 0-10,     // soft factors alignment
  "technical_score": 0-10,         // from interview performance
  "overall_match_score": 0-10,     // weighted composite
  "match_reasoning": "..."         // 1-2 sentence explanation
}

Scoring guide:
- Skill match: 10 = all required + preferred, 7 = all required, 4 = some required, 0 = none
- Check for deal-breakers — if any hit, cap overall at 3
- Weight: skills 35%, experience 20%, culture 15%, technical 30%
```

4. Upsert into `match_scores`
5. Notify founder dashboard via Supabase Realtime

**Key files:**
```
lib/matching/engine.ts                -- orchestrates matching
lib/matching/prompts.ts               -- Claude matching prompts
app/api/matching/run/route.ts         -- API trigger (also callable from edge function)
supabase/functions/match-on-interview -- edge function triggered after candidate interview
```

---

### Module 6: Email / Notifications

**Intro email (sent to both parties on "Connect"):**

**To Founder:**
```
Subject: You're connected with {candidate_name}!

Hi {founder_name},

Great news — you've been matched with {candidate_name} for your
{role_title} role at {company_name}.

About {candidate_name}:
- {experience_years} years of experience
- Key skills: {overlapping_skills}
- {1-sentence behavioral summary}

Their email: {candidate_email}
{linkedin_url if available}

Take it from here — we recommend scheduling a quick call!
```

**To Candidate:**
```
Subject: A startup wants to meet you!

Hi {candidate_name},

{founder_name} from {company_name} liked your profile and wants to connect
about their {role_title} role.

About {company_name}:
- {company_description}
- Looking for: {role_description snippet}

{founder_name}'s email: {founder_email}

Good luck!
```

**Key files:**
```
lib/email/send-intro.ts
lib/email/templates/founder-intro.tsx
lib/email/templates/candidate-intro.tsx
```

---

## Voice Interview Implementation Notes

### Deepgram Integration Pattern

```
Browser Mic → Deepgram STT (WebSocket) → text
                                           ↓
                               Claude API (conversation turn)
                                           ↓
                                      response text
                                           ↓
                          Deepgram TTS (REST or WS) → audio → Browser Speaker
```

- Use Deepgram's `nova-2` model for STT
- Use Deepgram's Aura for TTS
- Maintain conversation history in-memory during interview
- On interview end, flush full transcript to DB
- Handle interruptions gracefully (stop TTS if user starts talking)

### Anti-Cheating Measures (Candidate Interview)
- System design questions are dynamically generated (not from a bank)
- Questions are contextualized to the candidate's stated experience
- AI follows up with probing questions that require understanding
- Rapid follow-ups make it hard to look things up
- Behavioral phase establishes baseline for claimed skills
- Phase 2 validates Phase 1 claims through applied questions
- Future: voice analysis for confidence/hesitation patterns

---

## Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx
│   ├── founder/
│   │   ├── interview/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── candidate-card.tsx
│   │       └── candidate-detail.tsx
│   ├── candidate/
│   │   └── interview/page.tsx
│   ├── api/
│   │   ├── interview/
│   │   │   ├── founder/route.ts
│   │   │   └── candidate/route.ts
│   │   ├── matching/run/route.ts
│   │   └── connect/route.ts
│   ├── layout.tsx
│   └── page.tsx                        -- landing page
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── deepgram/
│   │   ├── stt.ts
│   │   └── tts.ts
│   ├── interview/
│   │   ├── founder-prompts.ts
│   │   ├── candidate-prompts.ts
│   │   ├── question-generator.ts
│   │   ├── extract-founder.ts
│   │   └── evaluate-candidate.ts
│   ├── matching/
│   │   ├── engine.ts
│   │   └── prompts.ts
│   └── email/
│       ├── send-intro.ts
│       └── templates/
│           ├── founder-intro.tsx
│           └── candidate-intro.tsx
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── match-on-interview/index.ts
├── components/
│   ├── ui/                             -- shadcn components
│   ├── interview/
│   │   ├── voice-recorder.tsx
│   │   ├── interview-ui.tsx
│   │   └── transcript-display.tsx
│   └── dashboard/
│       ├── score-badge.tsx
│       └── skill-tags.tsx
├── .env.local.example
├── package.json
├── claude.md                           -- this file
└── README.md
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Deepgram
DEEPGRAM_API_KEY=

# Claude / Anthropic
ANTHROPIC_API_KEY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@foundermatch.com
```

---

## Build Order (Recommended)

### Phase 1 — Foundation ✅
1. [x] Init Next.js + Tailwind + shadcn
2. [x] Supabase project setup + run migrations
3. [x] Auth flow (signup/login/onboarding with role selection)
4. [x] Basic layout and navigation

### Phase 2 — Founder Flow
5. [ ] Deepgram STT/TTS integration (standalone test page)
6. [ ] Founder interview page (voice UI + Claude orchestration)
7. [ ] Founder profile extraction and DB storage
8. [ ] Founder dashboard (static/mock data first)

### Phase 3 — Candidate Flow
9. [ ] Candidate interview Phase 1 (behavioral)
10. [ ] Question generator (contextual system design)
11. [ ] Candidate interview Phase 2 (system design)
12. [ ] Candidate evaluation and scoring

### Phase 4 — Matching & Connection
13. [ ] Matching engine (Claude-powered scoring)
14. [ ] Dashboard with real match data + Supabase Realtime
15. [ ] Connect flow + intro emails via Resend

### Phase 5 — Polish
16. [ ] Landing page
17. [ ] Error handling, loading states, edge cases
18. [ ] Mobile responsive
19. [ ] Rate limiting and abuse prevention
20. [ ] Deploy to Vercel + custom domain

---

## Key Design Decisions

**Why Supabase?**
Auth + Postgres + RLS + Realtime + Edge Functions in one. Fast to set up, generous free tier, great DX with Next.js.

**Why Claude for matching (not vector similarity)?**
Matching founders and candidates requires nuanced reasoning — understanding that "React Native" partially matches "React", that a founder who values "move fast" might clash with someone who "likes thorough planning", and that deal-breakers are absolute. Claude handles this better than cosine similarity on embeddings.

**Why no candidate-facing results?**
Prevents gaming the system. Candidates can't optimize for scores they can't see. Founders get unbiased signal.

**Why system design over leetcode?**
System design questions are harder to cheat on (no standard answers), test real-world thinking, and can be tailored to the actual work the candidate would do. Combined with behavioral validation, this gives strong signal.