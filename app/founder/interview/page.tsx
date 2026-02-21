import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FounderInterviewClient } from "./client";
import Link from "next/link";
import {
  Briefcase,
  MapPin,
  BarChart3,
  Shield,
  Heart,
  Star,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export default async function FounderInterviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: founder } = await supabase
    .from("founders")
    .select("id, full_name, company_name, company_description, website")
    .eq("id", user.id)
    .single();

  if (!founder) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("founder_profiles")
    .select("*")
    .eq("founder_id", founder.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (profile) {
    const experienceLabelMap: Record<string, string> = {
      junior: "Junior",
      mid: "Mid-level",
      senior: "Senior",
      lead: "Lead",
    };
    const workStyleLabelMap: Record<string, string> = {
      remote: "Remote",
      hybrid: "Hybrid",
      onsite: "On-site",
    };

    const interviewDate = profile.created_at
      ? new Date(profile.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600 mb-1">
              Your Hiring Profile
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.role_title ?? "Open Role"}
            </h1>
            <p className="text-gray-500 mt-1">
              {founder.company_name}
              {interviewDate && (
                <span className="text-gray-300 mx-2">·</span>
              )}
              {interviewDate && (
                <span className="text-gray-400 text-sm">
                  Interviewed {interviewDate}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/founder/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            View Matches
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-5">
          {/* Role Description */}
          {profile.role_description && (
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  About this Role
                </h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {profile.role_description}
              </p>
            </section>
          )}

          {/* Quick Details */}
          <div className="grid grid-cols-2 gap-4">
            {profile.experience_level && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Experience
                  </span>
                </div>
                <p className="text-gray-900 font-medium">
                  {experienceLabelMap[profile.experience_level] ??
                    profile.experience_level}
                </p>
              </div>
            )}
            {profile.work_style && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Work Style
                  </span>
                </div>
                <p className="text-gray-900 font-medium">
                  {workStyleLabelMap[profile.work_style] ?? profile.work_style}
                </p>
              </div>
            )}
          </div>

          {/* Skills */}
          {((profile.required_skills?.length ?? 0) > 0 ||
            (profile.preferred_skills?.length ?? 0) > 0) && (
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Skills
                </h2>
              </div>
              {(profile.required_skills?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Must-have
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.required_skills!.map((skill: string) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(profile.preferred_skills?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Nice-to-have
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_skills!.map((skill: string) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Culture & Deal Breakers side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(profile.culture_values?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Culture & Values
                  </h2>
                </div>
                <ul className="space-y-2">
                  {profile.culture_values!.map((v: string) => (
                    <li
                      key={v}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      {v}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(profile.deal_breakers?.length ?? 0) > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Deal Breakers
                  </h2>
                </div>
                <ul className="space-y-2">
                  {profile.deal_breakers!.map((d: string) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                      {d}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <p className="text-sm text-gray-400">
              Candidates are being matched against this profile.
            </p>
            <Link
              href="/founder/interview/redo"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={14} />
              Redo Interview
            </Link>
          </div>
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

      <FounderInterviewClient />
    </div>
  );
}
