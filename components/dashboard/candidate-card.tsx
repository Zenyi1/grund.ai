"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { connectWithCandidate } from "@/app/founder/dashboard/actions";
import { cn } from "@/lib/utils";
import type { RankedMatch, NormalizedWeights } from "@/app/founder/dashboard/types";

function scoreColor(s: number) {
  if (s >= 8) return { text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500" };
  if (s >= 6) return { text: "text-amber-700",   bg: "bg-amber-50",   bar: "bg-amber-500"   };
  if (s >= 4) return { text: "text-orange-700",  bg: "bg-orange-50",  bar: "bg-orange-500"  };
  return         { text: "text-red-700",    bg: "bg-red-50",    bar: "bg-red-500"    };
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

  const colors = scoreColor(match.weightedScore);

  const dimensions = [
    { label: "Skills",     score: match.skill_match_score,      weight: normalizedWeights.skills     },
    { label: "Technical",  score: match.technical_score,         weight: normalizedWeights.technical  },
    { label: "Experience", score: match.experience_match_score,  weight: normalizedWeights.experience },
    { label: "Culture",    score: match.culture_match_score,     weight: normalizedWeights.culture    },
  ];

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
        "bg-white rounded-xl border border-gray-200 transition-shadow cursor-pointer",
        expanded ? "shadow-md border-gray-300" : "hover:shadow-sm"
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* ── Main row ─────────────────────────────────────────── */}
      <div className="p-5 flex items-start gap-4">
        {/* Rank badge */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
          <span className="text-xs font-bold text-gray-500">#{rank}</span>
        </div>

        {/* Name + skills */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{candidate.full_name}</span>
            {profile.experience_level && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                {profile.experience_level}
              </span>
            )}
            {profile.experience_years != null && (
              <span className="text-xs text-gray-400">
                {profile.experience_years}y exp
              </span>
            )}
          </div>

          {/* Skill tags */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.slice(0, 7).map((skill) => (
              <span
                key={skill}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  isRequired(skill)
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {skill}
              </span>
            ))}
            {skills.length > 7 && (
              <span className="text-xs text-gray-400 self-center">
                +{skills.length - 7} more
              </span>
            )}
          </div>

          {/* Match reasoning — visible when collapsed */}
          {!expanded && match.match_reasoning && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-1">
              {match.match_reasoning}
            </p>
          )}
        </div>

        {/* Score + connect + expand toggle */}
        <div className="shrink-0 flex flex-col items-end gap-2.5">
          {/* Weighted score */}
          <div className={cn("rounded-lg px-3 py-1.5 text-center min-w-[56px]", colors.bg)}>
            <span className={cn("text-2xl font-bold leading-none", colors.text)}>
              {match.weightedScore.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 block">/10</span>
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={isPending || connected}
            className={cn(
              "text-sm px-4 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap",
              connected
                ? "bg-emerald-50 text-emerald-700 cursor-default"
                : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60"
            )}
          >
            {isPending ? "Sending…" : connected ? "Connected ✓" : "Connect"}
          </button>

          {connectError && (
            <p className="text-xs text-red-500 text-right max-w-[120px]">{connectError}</p>
          )}

          {/* Expand chevron */}
          <span className="text-gray-400 mt-0.5">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {/* ── Expanded detail ──────────────────────────────────── */}
      {expanded && (
        <div
          className="border-t border-gray-100 px-5 py-5 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Score breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Score breakdown
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {dimensions.map(({ label, score, weight }) => {
                const s = score ?? 0;
                const c = scoreColor(s);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{Math.round(weight * 100)}% weight</span>
                        <span className={cn("font-bold", c.text)}>{s.toFixed(1)}</span>
                      </div>
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

          {/* Match reasoning */}
          {match.match_reasoning && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Why this match
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{match.match_reasoning}</p>
            </div>
          )}

          {/* Behavioral summary */}
          {profile.behavioral_summary && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Candidate summary
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.behavioral_summary}</p>
            </div>
          )}

          {/* Strengths */}
          {(profile.strengths ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Strengths
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.strengths!.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* All skills (if more than 7) */}
          {skills.length > 7 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                All skills{" "}
                <span className="normal-case text-gray-300 font-normal">
                  (violet = required match)
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      isRequired(skill)
                        ? "bg-violet-100 text-violet-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {candidate.linkedin_url && (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink size={13} />
              View LinkedIn profile
            </a>
          )}
        </div>
      )}
    </div>
  );
}
