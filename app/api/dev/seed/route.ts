/**
 * DEV ONLY — Seed the dashboard with 5 realistic fake candidates.
 *
 * Usage:
 *   1. npm run dev
 *   2. Sign up + complete onboarding as a Founder
 *   3. GET http://localhost:3000/api/dev/seed
 *   4. Visit /founder/dashboard
 *
 * Safe to run multiple times — idempotent.
 * Will NOT run in production (NODE_ENV check).
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Hardcoded stable UUIDs for test candidates — same every run (idempotent)
const TEST_CANDIDATES = [
  {
    id: "cc000000-0000-0000-0000-000000000001",
    email: "alice.chen@foundermatch.dev",
    name: "Alice Chen",
    linkedin_url: "https://linkedin.com/in/alicechen-dev",
    profile: {
      skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "Docker"],
      experience_years: 6,
      experience_level: "senior",
      strengths: ["System architecture", "Code quality", "Mentorship"],
      work_style_preference: "remote",
      behavioral_summary:
        "Highly collaborative senior engineer with a track record of shipping production systems. Prefers clear ownership and moves fast without breaking things.",
      behavioral_score: 8.5,
      system_design_question:
        "Design a real-time notification system for 1M daily active users.",
      system_design_summary:
        "Proposed event-driven architecture with Redis pub/sub, WebSocket fan-out, and graceful degradation. Correctly identified bottlenecks and tradeoffs.",
      system_design_score: 8.8,
      overall_score: 8.7,
    },
    match: {
      skill_match_score: 9.2,
      experience_match_score: 8.5,
      culture_match_score: 8.0,
      technical_score: 8.8,
      overall_match_score: 8.8,
      match_reasoning:
        "Alice's TypeScript + React + Node.js + PostgreSQL stack is a near-perfect fit. Six years of senior experience aligns well, and her system design showed strong architectural instincts.",
    },
  },
  {
    id: "cc000000-0000-0000-0000-000000000002",
    email: "david.kim@foundermatch.dev",
    name: "David Kim",
    linkedin_url: "https://linkedin.com/in/davidkim-eng",
    profile: {
      skills: ["TypeScript", "React", "Node.js", "AWS", "Kubernetes", "PostgreSQL", "GraphQL"],
      experience_years: 9,
      experience_level: "lead",
      strengths: ["Technical leadership", "System design", "Cross-team collaboration"],
      work_style_preference: "remote",
      behavioral_summary:
        "Lead engineer who has scaled teams from 3 to 20 engineers. Strong opinions on architecture, values shipping over perfection.",
      behavioral_score: 9.0,
      system_design_question:
        "Design a multi-tenant SaaS data isolation architecture.",
      system_design_summary:
        "Outstanding: covered schema-level isolation, row-level security, connection pooling, and edge cases like tenant migration.",
      system_design_score: 9.5,
      overall_score: 9.3,
    },
    match: {
      skill_match_score: 9.5,
      experience_match_score: 8.0,
      culture_match_score: 9.2,
      technical_score: 9.5,
      overall_match_score: 9.2,
      match_reasoning:
        "David is overqualified in seniority (lead vs senior) but his skills and technical depth are exceptional. Culture values align strongly — move-fast ethos matches.",
    },
  },
  {
    id: "cc000000-0000-0000-0000-000000000003",
    email: "carol.thompson@foundermatch.dev",
    name: "Carol Thompson",
    linkedin_url: null,
    profile: {
      skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "Redis"],
      experience_years: 7,
      experience_level: "senior",
      strengths: ["Backend reliability", "API design", "Performance optimization"],
      work_style_preference: "hybrid",
      behavioral_summary:
        "Backend-focused engineer with deep infra experience. Strong on distributed systems, less exposure to TypeScript/React frontend.",
      behavioral_score: 7.8,
      system_design_question: "Design a rate-limiting service for a public API.",
      system_design_summary:
        "Solid response covering token bucket, Redis distributed counters, and sliding window. Good instincts.",
      system_design_score: 8.2,
      overall_score: 8.0,
    },
    match: {
      skill_match_score: 5.5,
      experience_match_score: 8.5,
      culture_match_score: 7.0,
      technical_score: 8.2,
      overall_match_score: 7.0,
      match_reasoning:
        "Carol is a strong backend engineer but her stack is Python-centric — she's missing TypeScript and React. Good technical depth, notable skills gap on required frontend work.",
    },
  },
  {
    id: "cc000000-0000-0000-0000-000000000004",
    email: "bob.martinez@foundermatch.dev",
    name: "Bob Martinez",
    linkedin_url: "https://linkedin.com/in/bobmartinez-fe",
    profile: {
      skills: ["React", "JavaScript", "TypeScript", "CSS", "Vue.js"],
      experience_years: 3,
      experience_level: "mid",
      strengths: ["UI implementation", "Fast learner", "Design eye"],
      work_style_preference: "remote",
      behavioral_summary:
        "Mid-level frontend developer with solid React skills. Eager to grow into full stack. TypeScript knowledge is recent and still developing.",
      behavioral_score: 6.5,
      system_design_question:
        "Design the frontend architecture for a real-time collaborative editor.",
      system_design_summary:
        "Decent approach to state management and optimistic updates, but struggled with conflict resolution and backend coordination.",
      system_design_score: 5.8,
      overall_score: 6.2,
    },
    match: {
      skill_match_score: 6.0,
      experience_match_score: 5.5,
      culture_match_score: 7.5,
      technical_score: 5.8,
      overall_match_score: 6.1,
      match_reasoning:
        "Bob has React and TypeScript but lacks Node.js and PostgreSQL. At 3 years, he's below the senior bar. Shows potential but not quite ready for this role.",
    },
  },
  {
    id: "cc000000-0000-0000-0000-000000000005",
    email: "emma.wilson@foundermatch.dev",
    name: "Emma Wilson",
    linkedin_url: null,
    profile: {
      skills: ["React", "JavaScript", "HTML", "CSS", "Tailwind"],
      experience_years: 1,
      experience_level: "junior",
      strengths: ["UI polish", "Quick iterations", "Communication"],
      work_style_preference: "hybrid",
      behavioral_summary:
        "Junior developer with strong frontend basics. Just starting her career — impressive for her level but not ready for a senior role.",
      behavioral_score: 6.0,
      system_design_question:
        "How would you structure a React app for a multi-step form wizard?",
      system_design_summary:
        "Good understanding of component composition and state lifting, but limited awareness of scalability concerns.",
      system_design_score: 4.5,
      overall_score: 5.2,
    },
    match: {
      skill_match_score: 3.5,
      experience_match_score: 2.0,
      culture_match_score: 6.5,
      technical_score: 4.5,
      overall_match_score: 3.8,
      match_reasoning:
        "Emma is promising but significantly under-experienced for a senior role. Missing most of the required stack and at 1 year, the experience gap is too large right now.",
    },
  },
];

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Seed endpoint only available in development." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Must be signed in as a founder
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not signed in. Sign in as a founder first, then hit this route." },
      { status: 401 }
    );
  }

  const { data: founder } = await admin
    .from("founders")
    .select("id, company_name")
    .eq("id", user.id)
    .single();

  if (!founder) {
    return NextResponse.json(
      { error: "No founder profile found. Complete onboarding as a Founder first." },
      { status: 400 }
    );
  }

  // ── Upsert founder_profile ────────────────────────────────────────────────
  const { data: founderProfile, error: fpError } = await admin
    .from("founder_profiles")
    .upsert(
      {
        founder_id: user.id,
        raw_transcript: "[SEED] Simulated founder interview transcript.",
        required_skills: ["typescript", "react", "node.js", "postgresql"],
        preferred_skills: ["redis", "docker", "aws"],
        role_title: "Senior Full Stack Engineer",
        role_description:
          "Looking for a senior full stack engineer to lead core product development. You'll own the architecture, ship features fast, and grow with the team.",
        experience_level: "senior",
        work_style: "remote",
        culture_values: ["ownership", "transparency", "speed"],
        deal_breakers: ["must be full-time", "no moonlighting"],
        interview_duration_sec: 312,
      },
      {
        onConflict: "founder_id",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (fpError) {
    // If upsert failed because founder_id isn't a unique constraint, just insert or get existing
    const { data: existingFp } = await admin
      .from("founder_profiles")
      .select("id")
      .eq("founder_id", user.id)
      .limit(1)
      .single();

    if (!existingFp) {
      return NextResponse.json({ error: `founder_profile: ${fpError.message}` }, { status: 500 });
    }

    return runCandidateSeed(admin, existingFp.id, founder.company_name);
  }

  return runCandidateSeed(admin, founderProfile!.id, founder.company_name);
}

async function runCandidateSeed(
  admin: ReturnType<typeof createAdminClient>,
  founderProfileId: string,
  companyName: string
) {
  const results: Record<string, string> = {};

  for (const seed of TEST_CANDIDATES) {
    try {
      // 1. Create auth user (stable UUID — idempotent)
      await admin.auth.admin.createUser({
        id: seed.id,
        email: seed.email,
        password: "foundermatch-seed-2024!",
        email_confirm: true,
        user_metadata: { full_name: seed.name },
      });
      // Ignore error if user already exists — we know the ID

      // 2. Upsert candidates row
      await admin.from("candidates").upsert(
        {
          id: seed.id,
          full_name: seed.name,
          email: seed.email,
          linkedin_url: seed.linkedin_url,
        },
        { onConflict: "id" }
      );

      // 3. Insert candidate_profile if not already there
      const { data: existingCp } = await admin
        .from("candidate_profiles")
        .select("id")
        .eq("candidate_id", seed.id)
        .limit(1)
        .single();

      let candidateProfileId: string;

      if (existingCp) {
        candidateProfileId = existingCp.id;
      } else {
        const { data: cp, error: cpErr } = await admin
          .from("candidate_profiles")
          .insert({
            candidate_id: seed.id,
            raw_transcript: `[SEED] Simulated interview for ${seed.name}.`,
            ...seed.profile,
          })
          .select("id")
          .single();

        if (cpErr) {
          results[seed.name] = `candidate_profile error: ${cpErr.message}`;
          continue;
        }
        candidateProfileId = cp!.id;
      }

      // 4. Upsert match score
      await admin.from("match_scores").upsert(
        {
          founder_profile_id: founderProfileId,
          candidate_profile_id: candidateProfileId,
          ...seed.match,
        },
        { onConflict: "founder_profile_id,candidate_profile_id" }
      );

      results[seed.name] = "✓ seeded";
    } catch (err) {
      results[seed.name] = `unexpected error: ${String(err)}`;
    }
  }

  return NextResponse.json({
    success: true,
    company: companyName,
    founderProfileId,
    candidates: results,
    next: "Visit http://localhost:3000/founder/dashboard",
  });
}
