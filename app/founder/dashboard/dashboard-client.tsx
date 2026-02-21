"use client";

import { useState, useMemo } from "react";
import WeightControls from "@/components/dashboard/weight-controls";
import CandidateCard from "@/components/dashboard/candidate-card";
import type {
  MatchRow,
  Weights,
  NormalizedWeights,
  FounderProfileSummary,
} from "./types";

const DEFAULT_WEIGHTS: Weights = {
  skills: 35,
  experience: 20,
  culture: 15,
  technical: 30,
};

function normalize(w: Weights): NormalizedWeights {
  const total = w.skills + w.experience + w.culture + w.technical;
  if (total === 0) return { skills: 0.25, experience: 0.25, culture: 0.25, technical: 0.25 };
  return {
    skills: w.skills / total,
    experience: w.experience / total,
    culture: w.culture / total,
    technical: w.technical / total,
  };
}

export default function DashboardClient({
  matches,
  founderProfile,
  connectedCandidateIds,
}: {
  matches: MatchRow[];
  founderProfile: FounderProfileSummary;
  connectedCandidateIds: string[];
}) {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  const normalizedWeights = useMemo(() => normalize(weights), [weights]);

  const rankedMatches = useMemo(() => {
    return matches
      .map((m) => ({
        ...m,
        weightedScore:
          (m.skill_match_score ?? 0) * normalizedWeights.skills +
          (m.experience_match_score ?? 0) * normalizedWeights.experience +
          (m.culture_match_score ?? 0) * normalizedWeights.culture +
          (m.technical_score ?? 0) * normalizedWeights.technical,
        isConnected: connectedCandidateIds.includes(
          m.candidate_profiles?.candidate_id ?? ""
        ),
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 5);
  }, [matches, normalizedWeights, connectedCandidateIds]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Matches</h1>
          {founderProfile.role_title && (
            <p className="text-gray-500 mt-1">for {founderProfile.role_title}</p>
          )}
        </div>
        <p className="text-sm text-gray-400 pt-1">
          Top {rankedMatches.length} of {matches.length} candidate
          {matches.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Weight controls */}
      <WeightControls weights={weights} onChange={setWeights} />

      {/* Candidate cards */}
      {rankedMatches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <p className="text-gray-500 font-medium">No candidates yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Candidates will appear here as they complete their interviews.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rankedMatches.map((match, i) => (
            <CandidateCard
              key={match.id}
              match={match}
              rank={i + 1}
              normalizedWeights={normalizedWeights}
              requiredSkills={founderProfile.required_skills ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
