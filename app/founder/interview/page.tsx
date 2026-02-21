import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FounderInterviewClient } from "./client";

export default async function FounderInterviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: founder } = await supabase
    .from("founders")
    .select("id, full_name")
    .eq("id", user.id)
    .single();

  if (!founder) redirect("/onboarding");

  const { data: existingProfile } = await supabase
    .from("founder_profiles")
    .select("id, role_title, required_skills, created_at")
    .eq("founder_id", founder.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingProfile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Complete
          </h1>
          <p className="text-gray-500 mt-1">
            You&apos;ve already completed your hiring profile interview.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <dl className="space-y-4">
            {existingProfile.role_title && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="text-gray-900">{existingProfile.role_title}</dd>
              </div>
            )}
            {existingProfile.required_skills &&
              existingProfile.required_skills.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Required Skills
                  </dt>
                  <dd className="flex flex-wrap gap-2 mt-1">
                    {existingProfile.required_skills.map((skill: string) => (
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
            Candidates are being matched based on this profile. Check your
            dashboard for results.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hiring Profile Interview
        </h1>
        <p className="text-gray-500 mt-1">
          Tell us about the role you&apos;re hiring for. Our AI will ask you a
          few questions to build your hiring profile.
        </p>
      </div>

      <FounderInterviewClient founderId={founder.id} />
    </div>
  );
}
