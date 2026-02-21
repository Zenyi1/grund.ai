import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/server";

interface FounderProfile {
  id: string;
  role_title: string | null;
  role_description: string | null;
  required_skills: string[];
  preferred_skills: string[];
}

interface GeneratedQuestion {
  question: string;
  matchedFounderProfileId: string | null;
}

const FALLBACK_QUESTION =
  "Design a URL shortener service like bit.ly. Walk me through your architecture, how you'd handle high traffic, and how you'd store and look up the mappings efficiently.";

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({
    model: "gemini-2.0-flash",
  });
}

export async function extractSkillsFromTranscript(
  transcript: string
): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — skipping skill extraction");
    return [];
  }

  try {
    const model = getGemini();
    const result = await model.generateContent(
      `Extract the technical skills mentioned or clearly implied in this interview transcript. Return ONLY a JSON array of lowercase skill strings. No explanation.\n\nTranscript:\n${transcript}`
    );
    const text = result.response.text();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as string[];
    }
  } catch (err) {
    console.error("Skill extraction failed:", err);
  }

  return [];
}

async function findMatchingFounderProfiles(
  candidateSkills: string[]
): Promise<FounderProfile[]> {
  if (candidateSkills.length === 0) return [];

  try {
    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from("founder_profiles")
      .select("id, role_title, role_description, required_skills, preferred_skills");

    if (error || !profiles || profiles.length === 0) return [];

    const normalizedCandidate = candidateSkills.map((s) => s.toLowerCase());

    const scored = profiles.map((profile) => {
      const required = (profile.required_skills || []).map((s: string) => s.toLowerCase());
      const preferred = (profile.preferred_skills || []).map((s: string) => s.toLowerCase());

      const requiredOverlap = required.filter((s: string) => normalizedCandidate.includes(s)).length;
      const preferredOverlap = preferred.filter((s: string) => normalizedCandidate.includes(s)).length;

      const score =
        requiredOverlap * 2 +
        preferredOverlap +
        (required.length > 0 ? requiredOverlap / required.length : 0);

      return { profile, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter((s) => s.score > 0).slice(0, 3).map((s) => s.profile as FounderProfile);
  } catch (err) {
    console.error("Failed to fetch founder profiles:", err);
    return [];
  }
}

export async function generateSystemDesignQuestion(
  transcript: string,
  candidateSkills: string[]
): Promise<GeneratedQuestion> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — using fallback question");
    return { question: FALLBACK_QUESTION, matchedFounderProfileId: null };
  }

  const matchingProfiles = await findMatchingFounderProfiles(candidateSkills);

  let founderContext = "";
  let matchedProfileId: string | null = null;

  if (matchingProfiles.length > 0) {
    const top = matchingProfiles[0];
    matchedProfileId = top.id;
    founderContext = `
The candidate may be a good fit for: ${top.role_title || "Software Engineer"}.
Role description: ${top.role_description || "N/A"}
Required skills: ${top.required_skills?.join(", ") || "N/A"}
Preferred skills: ${top.preferred_skills?.join(", ") || "N/A"}`;
  }

  try {
    const model = getGemini();
    const result = await model.generateContent(
      `Generate a system design interview question based on:

Candidate skills: ${candidateSkills.join(", ") || "general software engineering"}
${founderContext}

The question should:
1. Use technologies the candidate claims to know
2. ${matchedProfileId ? "Be relevant to what the matching company is building" : "Test general architectural thinking"}
3. Test architectural thinking, not trivia
4. Be discussable in ~2.5 minutes
5. Have natural follow-up probes

Return ONLY the question text. No preamble, no explanation. 1-2 sentences max.`
    );

    const question = result.response.text().trim();
    return { question: question || FALLBACK_QUESTION, matchedFounderProfileId: matchedProfileId };
  } catch (err) {
    console.error("Question generation failed, using fallback:", err);
    return { question: FALLBACK_QUESTION, matchedFounderProfileId: null };
  }
}
