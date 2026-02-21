# Founder Track — Developer Guide

End-to-end flow for the founder side of FounderMatch: from signup through voice interview to the ranked candidate dashboard.

---

## Flow Overview

```
/signup  →  /onboarding  →  /founder/interview  →  /founder/dashboard
              (DB row)        (voice AI + Claude)      (weighted matches)
```

---

## Step 1 — Auth & Onboarding

**Already built.** When a user selects "Founder" on `/onboarding` and submits:

```typescript
// Server action: app/(auth)/actions.ts → completeOnboarding()
supabase.from('founders').insert({
  id: user.id,            // = auth.users.id
  full_name,
  company_name,
  company_description,    // optional
  website,               // optional
})
// → redirect('/founder/dashboard')
```

The `founders` row is created. The dashboard is now accessible but shows an empty state until a `founder_profiles` row exists.

---

## Step 2 — Founder Interview (your job to build)

**Path:** `app/founder/interview/page.tsx`
**API route:** `app/api/interview/founder/route.ts`

The interview is a ~5–7 min voice conversation (Deepgram STT → Claude → Deepgram TTS). When it ends, the transcript is sent to Claude for structured extraction.

### What you must write to the DB when the interview ends

```typescript
// lib/interview/extract-founder.ts → call Claude with extraction prompt
// Then write the result to:

supabase.from('founder_profiles').insert({
  founder_id: user.id,          // REQUIRED — FK to founders.id

  raw_transcript: '...',        // REQUIRED — full interview transcript

  // Extracted by Claude (see extraction prompt in CLAUDE.md):
  required_skills: ['typescript', 'react', 'node.js'],  // string[]
  preferred_skills: ['redis', 'docker'],                  // string[]
  role_title: 'Senior Full Stack Engineer',               // string
  role_description: '...',                                // string
  experience_level: 'senior',   // 'junior' | 'mid' | 'senior' | 'lead'
  work_style: 'remote',         // 'remote' | 'hybrid' | 'onsite'
  culture_values: ['ownership', 'speed'],                 // string[]
  deal_breakers: ['must be full-time'],                   // string[]
  interview_duration_sec: 312,                            // int
})
```

**After inserting** the `founder_profiles` row, trigger the matching engine:

```typescript
// Option A — call the API route directly
await fetch('/api/matching/run', {
  method: 'POST',
  body: JSON.stringify({ founderProfileId }),
})

// Option B — the Supabase edge function picks it up automatically
// supabase/functions/match-on-interview/index.ts (to be built in Phase 4)
```

---

## Step 3 — Matching Engine (Phase 4)

After a `founder_profiles` row is created, the matching engine computes scores against all existing `candidate_profiles` rows and writes to `match_scores`.

```typescript
// Each row written by the engine:
supabase.from('match_scores').upsert({
  founder_profile_id: '...',        // FK to founder_profiles.id
  candidate_profile_id: '...',      // FK to candidate_profiles.id

  skill_match_score: 9.2,           // 0–10
  experience_match_score: 8.5,      // 0–10
  culture_match_score: 8.0,         // 0–10
  technical_score: 8.8,             // 0–10 (from candidate's interview)
  overall_match_score: 8.8,         // weighted composite

  match_reasoning: '...',           // 1–2 sentence Claude explanation
}, { onConflict: 'founder_profile_id,candidate_profile_id' })
```

The dashboard reads these rows. **You do not need to touch the dashboard code** — it automatically reflects any `match_scores` rows for the founder's active profile.

---

## Step 4 — Dashboard (already built)

**Path:** `app/founder/dashboard/`

The dashboard:
1. Reads the founder's most recent `founder_profiles` row (by `created_at DESC`)
2. Joins with `match_scores` → `candidate_profiles` → `candidates`
3. Lets the founder adjust 4 weight sliders (skills / technical / experience / culture)
4. Re-ranks in the browser, shows top 5
5. "Connect" button writes to `connections` table

### What the dashboard reads

| Column | Used for |
|--------|----------|
| `founder_profiles.required_skills` | Highlight matching candidate skills (violet tags) |
| `founder_profiles.role_title` | Dashboard subtitle |
| `match_scores.skill_match_score` | Skills dimension bar |
| `match_scores.experience_match_score` | Experience dimension bar |
| `match_scores.culture_match_score` | Culture dimension bar |
| `match_scores.technical_score` | Technical dimension bar |
| `match_scores.match_reasoning` | Shown in expanded card view |
| `candidate_profiles.skills` | Skill tag cloud |
| `candidate_profiles.experience_level` | Badge (junior/mid/senior/lead) |
| `candidate_profiles.experience_years` | "Xy exp" label |
| `candidate_profiles.behavioral_summary` | Expanded card section |
| `candidate_profiles.strengths` | Expanded card section |
| `candidates.full_name` | Card header |
| `candidates.linkedin_url` | External link in expanded view |

### Weighted score formula

```
weighted = (skill_match_score     × w_skills)
         + (experience_match_score × w_experience)
         + (culture_match_score    × w_culture)
         + (technical_score        × w_technical)

# weights are normalized to sum to 1.0
# default: skills=35%, experience=20%, culture=15%, technical=30%
```

This is calculated client-side in real time — no API call needed when weights change.

---

## Testing Without a Real Interview

A dev seed endpoint is available to populate the dashboard with 5 realistic fake candidates:

```bash
# 1. Start the dev server
npm run dev

# 2. Sign up at http://localhost:3000/signup
#    Complete onboarding as a Founder

# 3. Hit the seed route (in browser or curl)
curl http://localhost:3000/api/dev/seed

# 4. Open the dashboard
open http://localhost:3000/founder/dashboard
```

The seed creates:
- 1 `founder_profiles` row (Senior Full Stack Engineer, requires TypeScript/React/Node.js/PostgreSQL)
- 5 test candidates with realistic scores across all 4 dimensions
- 5 `match_scores` rows linked to the above

Safe to run multiple times — idempotent.
**Only works when `NODE_ENV=development`.**

---

## Key Files

```
app/founder/
├── interview/page.tsx              ← YOUR JOB (Phase 2)
├── dashboard/
│   ├── page.tsx                    ← Server: fetches match data
│   ├── dashboard-client.tsx        ← Client: weight state + ranking
│   ├── actions.ts                  ← Server action: connectWithCandidate()
│   └── types.ts                    ← Shared TypeScript types

app/api/
├── interview/founder/route.ts      ← YOUR JOB (Phase 2)
├── matching/run/route.ts           ← Phase 4
└── dev/seed/route.ts               ← Dev only

lib/
├── supabase/server.ts              ← createClient() + createAdminClient()
├── interview/
│   ├── founder-prompts.ts          ← Claude system prompt (YOUR JOB)
│   └── extract-founder.ts          ← Post-interview extraction (YOUR JOB)
└── matching/engine.ts              ← Phase 4
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://vzjxalakudkqovfygmjw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see .env.local.example>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard Settings → API>
DEEPGRAM_API_KEY=<for interview STT/TTS>
ANTHROPIC_API_KEY=<for Claude conversation + extraction>
```

---

## Data Contract Summary

**You (interview dev) write:**
- `founder_profiles` row after interview ends
- Trigger `POST /api/matching/run` with the new profile ID

**Dashboard reads automatically:**
- `match_scores` joined with `candidate_profiles` and `candidates`
- No dashboard changes needed when new candidates are matched

**Supabase project:** `vzjxalakudkqovfygmjw` — see `SUPABASE_SETUP.md` for connection details.
