import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

interface FounderProfile {
  id: string;
  role_title: string | null;
  role_description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  company_name?: string;
}

interface GeneratedQuestion {
  question: string;
  matchedFounderProfileId: string | null;
}

export async function extractSkillsFromTranscript(
  transcript: string
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Extract the technical skills mentioned or clearly implied in this interview transcript. Return ONLY a JSON array of lowercase skill strings. No explanation.

Transcript:
${transcript}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as string[];
    }
  } catch {
    console.error("Failed to parse skills from Claude response:", text);
  }

  return [];
}

async function findMatchingFounderProfiles(
  candidateSkills: string[]
): Promise<FounderProfile[]> {
  const supabase = createAdminClient();

  const { data: profiles, error } = await supabase
    .from("founder_profiles")
    .select(
      "id, role_title, role_description, required_skills, preferred_skills, founder_id"
    );

  if (error || !profiles || profiles.length === 0) {
    return [];
  }

  const normalizedCandidate = candidateSkills.map((s) => s.toLowerCase());

  const scored = profiles.map((profile) => {
    const required = (profile.required_skills || []).map((s: string) =>
      s.toLowerCase()
    );
    const preferred = (profile.preferred_skills || []).map((s: string) =>
      s.toLowerCase()
    );

    const requiredOverlap = required.filter((s: string) =>
      normalizedCandidate.includes(s)
    ).length;
    const preferredOverlap = preferred.filter((s: string) =>
      normalizedCandidate.includes(s)
    ).length;

    const score =
      requiredOverlap * 2 + preferredOverlap + (required.length > 0 ? requiredOverlap / required.length : 0);

    return { profile, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.profile as FounderProfile);
}

export async function generateSystemDesignQuestion(
  transcript: string,
  candidateSkills: string[]
): Promise<GeneratedQuestion> {
  const matchingProfiles = await findMatchingFounderProfiles(candidateSkills);

  let founderContext = "";
  let matchedProfileId: string | null = null;

  if (matchingProfiles.length > 0) {
    const top = matchingProfiles[0];
    matchedProfileId = top.id;
    founderContext = `
The candidate may be a good fit for a role: ${top.role_title || "Software Engineer"}.
Role description: ${top.role_description || "N/A"}
Required skills for this role: ${top.required_skills?.join(", ") || "N/A"}
Preferred skills: ${top.preferred_skills?.join(", ") || "N/A"}`;
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Generate a system design interview question based on:

Candidate skills: ${candidateSkills.join(", ")}
${founderContext}

The question should:
1. Use technologies the candidate claims to know
2. ${matchedProfileId ? "Be relevant to what the matching company is building" : "Test general architectural thinking"}
3. Test architectural thinking, not trivia
4. Be discussable in ~5 minutes
5. Have natural follow-up probes

Return ONLY the question text. No preamble, no explanation. Just the question itself (1-3 sentences).`,
      },
    ],
  });

  const question =
    response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "Design a scalable web application that handles real-time data updates for thousands of concurrent users. How would you architect the system and what trade-offs would you consider?";

  return { question, matchedFounderProfileId: matchedProfileId };
}
