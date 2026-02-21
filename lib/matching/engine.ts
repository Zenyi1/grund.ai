import { createAdminClient } from "@/lib/supabase/server";
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
 * Called after Phase 2 of the candidate interview completes.
 */
export async function runMatchingForCandidate(candidateProfileId: string) {
  const supabase = createAdminClient();

  const { data: cp, error: cpErr } = await supabase
    .from("candidate_profiles")
    .select(
      "id, skills, experience_years, experience_level, strengths, work_style_preference, behavioral_score, system_design_score, overall_score"
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
      "id, required_skills, preferred_skills, experience_level, work_style, culture_values, deal_breakers"
    );

  if (fpErr || !founderProfiles?.length) {
    console.log("Matching engine: no founder profiles to match against");
    return;
  }

  // technical_score = candidate's interview score (behavioral 30% + system design 70%)
  const technicalScore = cp.overall_score ??
    ((cp.behavioral_score ?? 0) * 0.3 + (cp.system_design_score ?? 0) * 0.7);

  const upserts = founderProfiles.map((fp) => {
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
  });

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
