import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CandidateInterviewClient } from "./client";

export default async function CandidateInterviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, full_name")
    .eq("id", user.id)
    .single();

  if (!candidate) redirect("/onboarding");

  const { data: existingProfile } = await supabase
    .from("candidate_profiles")
    .select(
      "id, skills, behavioral_score, system_design_score, overall_score, system_design_question, created_at, raw_transcript"
    )
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const hasCompletedBothPhases =
    existingProfile?.raw_transcript?.includes("--- SYSTEM DESIGN PHASE ---");

  if (existingProfile && hasCompletedBothPhases) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Complete
          </h1>
          <p className="text-gray-500 mt-1">
            You&apos;ve completed both phases of your interview. Founders will
            be able to see your profile and reach out if there&apos;s a match.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <dl className="space-y-4">
            {existingProfile.skills && existingProfile.skills.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Skills Identified
                </dt>
                <dd className="flex flex-wrap gap-2 mt-1">
                  {existingProfile.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          <p className="text-xs text-gray-400 mt-6">
            Your results are being matched with founders. You&apos;ll receive
            an email if a founder wants to connect.
          </p>
        </div>
      </div>
    );
  }

  const resumePhase = existingProfile?.system_design_question
    ? "generating-complete"
    : undefined;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Interview</h1>
        <p className="text-gray-500 mt-1">
          This interview has two parts: a conversation about your background,
          then a system design discussion. It takes about 10 minutes total.
        </p>
      </div>

      <CandidateInterviewClient
        candidateId={candidate.id}
        resumePhase={resumePhase}
        existingQuestion={existingProfile?.system_design_question ?? undefined}
      />
    </div>
  );
}
