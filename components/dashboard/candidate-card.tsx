"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { connectWithCandidate } from "@/app/founder/dashboard/actions";
import { cn } from "@/lib/utils";
import type { RankedMatch, NormalizedWeights } from "@/app/founder/dashboard/types";

function scoreColor(s: number) {
  if (s >= 8) return { text: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500", ring: "ring-emerald-200" };
  if (s >= 6) return { text: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500", ring: "ring-amber-200" };
  if (s >= 4) return { text: "text-orange-600", bg: "bg-orange-50", bar: "bg-orange-500", ring: "ring-orange-200" };
  return { text: "text-red-600", bg: "bg-red-50", bar: "bg-red-500", ring: "ring-red-200" };
}

export default function CandidateCard({
  match,
  rank,
  normalizedWeights,
  requiredSkills,
}: {
  match: RankedMatch;
  rank: number;
  normalizedWeights: NormalizedWeights;
  requiredSkills: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [connected, setConnected] = useState(match.isConnected);
  const [connectError, setConnectError] = useState("");

  const profile = match.candidate_profiles;
  const candidate = profile?.candidates;
  if (!profile || !candidate) return null;

  const skills = profile.skills ?? [];
  const requiredLower = requiredSkills.map((s) => s.toLowerCase());
  const isRequired = (skill: string) => requiredLower.includes(skill.toLowerCase());

  const matchedSkills = skills.filter((s) => isRequired(s));
  const otherSkills = skills.filter((s) => !isRequired(s));
  const displaySkills = [...matchedSkills, ...otherSkills].slice(0, 5);

  const colors = scoreColor(match.weightedScore);

  const dimensions = [
    { label: "Skills", score: match.skill_match_score },
    { label: "Technical", score: match.technical_score },
    { label: "Experience", score: match.experience_match_score },
    { label: "Culture", score: match.culture_match_score },
  ];

  const bestDimension = dimensions.reduce((best, d) =>
    (d.score ?? 0) > (best.score ?? 0) ? d : best
  );
  const worstDimension = dimensions.reduce((worst, d) =>
    (d.score ?? 10) < (worst.score ?? 10) ? d : worst
  );

  function handleConnect(e: React.MouseEvent) {
    e.stopPropagation();
    setConnectError("");
    startTransition(async () => {
      const result = await connectWithCandidate(
        profile!.candidate_id,
        match.id
      );
      if (result?.error) setConnectError(result.error);
      else setConnected(true);
    });
  }

  return (
    <div
      className={cn(
        "bg-white rounded-xl border transition-all cursor-pointer",
        expanded ? "shadow-md border-gray-300" : "border-gray-200 hover:shadow-sm hover:border-gray-300"
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* ── Collapsed row ──────────────────────────────────── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Rank */}
        <span className="shrink-0 text-sm font-bold text-gray-300 w-6 text-right">
          {rank}
        </span>

        {/* Score circle */}
        <div className={cn(
          "shrink-0 w-12 h-12 rounded-full flex items-center justify-center ring-2",
          colors.bg, colors.ring
        )}>
          <span className={cn("text-lg font-bold", colors.text)}>
            {match.weightedScore.toFixed(1)}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-[15px]">
              {candidate.full_name}
            </span>
            <span className="text-xs text-gray-400">
              {[
                profile.experience_level,
                profile.experience_years != null ? `${profile.experience_years}y` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          {/* Skills inline */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {displaySkills.map((skill) => (
              <span
                key={skill}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full font-medium",
                  isRequired(skill)
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {skill}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="text-[11px] text-gray-300">
                +{skills.length - 5}
              </span>
            )}
          </div>

          {/* One-line reasoning — always visible */}
          {match.match_reasoning && (
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-1 leading-relaxed">
              {match.match_reasoning}
            </p>
          )}
        </div>

        {/* Right side: connect + chevron */}
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={handleConnect}
            disabled={isPending || connected}
            className={cn(
              "text-xs px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
              connected
                ? "bg-emerald-50 text-emerald-700 cursor-default"
                : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60"
            )}
          >
            {isPending ? "Sending…" : connected ? "Connected" : "Connect"}
          </button>

          {connectError && (
            <p className="text-[10px] text-red-500 max-w-[100px]">{connectError}</p>
          )}

          <span className="text-gray-300">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      {/* ── Expanded detail ────────────────────────────────── */}
      {expanded && (
        <div
          className="border-t border-gray-100 px-5 py-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-8">
            {/* Left column — about the candidate */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Quick signal */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={cn("inline-block w-2 h-2 rounded-full", scoreColor(bestDimension.score ?? 0).bar)} />
                  <span className="text-gray-500">Best:</span>
                  <span className="font-medium text-gray-700">
                    {bestDimension.label} ({(bestDimension.score ?? 0).toFixed(1)})
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={cn("inline-block w-2 h-2 rounded-full", scoreColor(worstDimension.score ?? 0).bar)} />
                  <span className="text-gray-500">Weakest:</span>
                  <span className="font-medium text-gray-700">
                    {worstDimension.label} ({(worstDimension.score ?? 0).toFixed(1)})
                  </span>
                </span>
              </div>

              {/* Behavioral summary */}
              {profile.behavioral_summary && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {profile.behavioral_summary}
                </p>
              )}

              {/* Strengths */}
              {(profile.strengths ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.strengths!.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* LinkedIn */}
              {candidate.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink size={12} />
                  LinkedIn
                </a>
              )}
            </div>

            {/* Right column — score bars */}
            <div className="shrink-0 w-48 space-y-3">
              {dimensions.map(({ label, score }) => {
                const s = score ?? 0;
                const c = scoreColor(s);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={cn("text-xs font-bold tabular-nums", c.text)}>
                        {s.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={cn("h-1.5 rounded-full transition-all", c.bar)}
                        style={{ width: `${(s / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
