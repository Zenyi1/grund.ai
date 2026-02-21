"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendIntroEmails } from "@/lib/email/send-intro";

export async function connectWithCandidate(
  candidateId: string,
  matchScoreId: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Insert connection record
  const { error } = await supabase.from("connections").insert({
    founder_id: user.id,
    candidate_id: candidateId,
    match_score_id: matchScoreId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Already connected with this candidate." };
    return { error: error.message };
  }

  // Fetch all data needed for intro emails
  const admin = createAdminClient();

  const [{ data: founder }, { data: candidate }, { data: matchScore }] =
    await Promise.all([
      admin
        .from("founders")
        .select("full_name, company_name, company_description")
        .eq("id", user.id)
        .single(),
      admin
        .from("candidates")
        .select("full_name, email, linkedin_url")
        .eq("id", candidateId)
        .single(),
      admin
        .from("match_scores")
        .select(
          "founder_profile_id, candidate_profiles(skills, experience_years, experience_level, behavioral_summary)"
        )
        .eq("id", matchScoreId)
        .single(),
    ]);

  const founderEmail = user.email;

  if (founder && candidate && founderEmail) {
    const cp = (matchScore?.candidate_profiles as unknown) as {
      skills: string[] | null;
      experience_years: number | null;
      experience_level: string | null;
      behavioral_summary: string | null;
    } | null;

    // Fetch role details from the founder profile
    let roleTitle: string | null = null;
    let roleDescription: string | null = null;
    if (matchScore?.founder_profile_id) {
      const { data: fp } = await admin
        .from("founder_profiles")
        .select("role_title, role_description")
        .eq("id", matchScore.founder_profile_id)
        .single();
      roleTitle = fp?.role_title ?? null;
      roleDescription = fp?.role_description ?? null;
    }

    // Send emails and mark as sent — don't block the action response
    Promise.all([
      sendIntroEmails({
        founderName: founder.full_name,
        founderEmail,
        companyName: founder.company_name,
        companyDescription: founder.company_description ?? null,
        roleTitle,
        roleDescription,
        candidateName: candidate.full_name,
        candidateEmail: candidate.email,
        candidateExperienceYears: cp?.experience_years ?? null,
        candidateExperienceLevel: cp?.experience_level ?? null,
        candidateSkills: cp?.skills ?? [],
        candidateSummary: cp?.behavioral_summary ?? null,
        linkedinUrl: candidate.linkedin_url ?? null,
      }),
      admin
        .from("connections")
        .update({ status: "sent", intro_email_sent_at: new Date().toISOString() })
        .eq("founder_id", user.id)
        .eq("candidate_id", candidateId),
    ]).catch((err) => console.error("Intro email error:", err));
  }

  revalidatePath("/founder/dashboard");
  return { success: true };
}
