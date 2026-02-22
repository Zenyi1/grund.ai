import { createAdminClient } from "@/lib/supabase/server";
import { evaluateTechnicalRelevance } from "@/lib/interview/evaluate-candidate";
import {
  calcSkillMatchScore,
  calcExperienceMatchScore,
  calcCultureMatchScore,
  hasDealBreaker,
} from "./score-helpers";

// Default weights (skills 35, experience 20, culture 15, technical 30)
const DEFAULT_WEIGHTS = { skills: 35, experience: 20, culture: 15, technical: 30 };

/**
 * Runs the deterministic matching engine for a given candidate profile.
 * Scores the candidate against every founder profile and upserts into match_scores.
 * The technical_score is evaluated per-founder using AI so it reflects how well
 * the candidate fits each specific role, not just their general interview performance.
 * Called after Phase 2 of the candidate interview completes.
 */
export async function runMatchingForCandidate(candidateProfileId: string) {
  const supabase = createAdminClient();

  const { data: cp, error: cpErr } = await supabase
    .from("candidate_profiles")
    .select(
      "id, skills, experience_years, experience_level, strengths, work_style_preference, behavioral_score, system_design_score, overall_score, raw_transcript"
    )
    .eq("id", candidateProfileId)
    .single();

  if (cpErr || !cp) {
    console.error("Matching engine: candidate profile not found", cpErr);
    return;
  }

  const { data: founderProfiles, error: fpErr } = await supabase
    .from("founder_profiles")
    .select(
      "id, required_skills, preferred_skills, experience_level, work_style, culture_values, deal_breakers, role_title, role_description"
    );

  if (fpErr || !founderProfiles?.length) {
    console.log("Matching engine: no founder profiles to match against");
    return;
  }

  // Fallback interview score if AI relevance evaluation fails
  const fallbackInterviewScore =
    cp.overall_score ??
    ((cp.behavioral_score ?? 0) * 0.3 + (cp.system_design_score ?? 0) * 0.7);

  // Score candidate against all founder profiles in parallel
  const upserts = await Promise.all(
    founderProfiles.map(async (fp) => {
      const skillScore = calcSkillMatchScore(
        cp.skills ?? [],
        fp.required_skills ?? [],
        fp.preferred_skills ?? []
      );
      const experienceScore = calcExperienceMatchScore(
        cp.experience_level,
        fp.experience_level
      );
      const cultureScore = calcCultureMatchScore(
        cp.work_style_preference,
        fp.work_style,
        cp.strengths ?? [],
        fp.culture_values ?? []
      );

      // Per-founder technical relevance: AI evaluates the candidate's transcript
      // specifically against this role's requirements — not a generic interview score.
      const technicalScore = cp.raw_transcript
        ? await evaluateTechnicalRelevance(cp.raw_transcript, {
            role_title: fp.role_title ?? null,
            role_description: fp.role_description ?? null,
            required_skills: fp.required_skills ?? [],
            preferred_skills: fp.preferred_skills ?? [],
          })
        : fallbackInterviewScore;

      const w = DEFAULT_WEIGHTS;
      let overall =
        (skillScore * w.skills +
          experienceScore * w.experience +
          cultureScore * w.culture +
          technicalScore * w.technical) /
        100;

      // Deal-breaker: cap at 3.0 regardless of weights
      if (hasDealBreaker(cp.experience_level, cp.work_style_preference, fp.deal_breakers ?? [])) {
        overall = Math.min(overall, 3.0);
      }

      return {
        founder_profile_id: fp.id,
        candidate_profile_id: candidateProfileId,
        skill_match_score: Math.round(skillScore * 10) / 10,
        experience_match_score: Math.round(experienceScore * 10) / 10,
        culture_match_score: Math.round(cultureScore * 10) / 10,
        technical_score: Math.round(technicalScore * 10) / 10,
        overall_match_score: Math.round(overall * 10) / 10,
      };
    })
  );

  const { error: upsertErr } = await supabase
    .from("match_scores")
    .upsert(upserts, { onConflict: "founder_profile_id,candidate_profile_id" });

  if (upsertErr) {
    console.error("Matching engine: upsert failed", upsertErr);
    return;
  }

  console.log(
    `Matching engine: scored candidate ${candidateProfileId} against ${upserts.length} founder profile(s)`
  );
}
