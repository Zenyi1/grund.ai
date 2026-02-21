import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function FounderDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Most recent founder profile (most recent interview)
  const { data: founderProfiles } = await supabase
    .from("founder_profiles")
    .select("id, role_title, required_skills")
    .eq("founder_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const activeProfile = founderProfiles?.[0] ?? null;

  if (!activeProfile) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Candidate Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Complete your founder interview to start receiving candidate matches.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-gray-500 font-medium">No interview completed yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Once your interview is done, matched candidates will appear here ranked by your priorities.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all match scores for this profile with nested candidate data
  const { data: matches } = await supabase
    .from("match_scores")
    .select(
      `
      id,
      candidate_profile_id,
      skill_match_score,
      experience_match_score,
      culture_match_score,
      technical_score,
      overall_match_score,
      match_reasoning,
      candidate_profiles (
        candidate_id,
        skills,
        experience_years,
        experience_level,
        strengths,
        behavioral_summary,
        behavioral_score,
        system_design_score,
        candidates (
          full_name,
          email,
          linkedin_url
        )
      )
    `
    )
    .eq("founder_profile_id", activeProfile.id)
    .order("overall_match_score", { ascending: false });

  // Which candidates this founder already connected with
  const { data: existingConnections } = await supabase
    .from("connections")
    .select("candidate_id")
    .eq("founder_id", user.id);

  const connectedIds = (existingConnections ?? []).map((c) => c.candidate_id);

  return (
    <DashboardClient
      matches={(matches ?? []) as unknown as Parameters<typeof DashboardClient>[0]["matches"]}
      founderProfile={activeProfile}
      connectedCandidateIds={connectedIds}
    />
  );
}
