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
  "Walk me through a significant challenge you faced in your work and how you solved it. Focus on your decision-making process and the trade-offs you considered.";

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
      `Extract the professional skills, tools, domains, and areas of expertise mentioned or clearly implied in this interview transcript. Include both technical skills (languages, frameworks) and non-technical ones (go-to-market, demand generation, product strategy, financial modeling, etc.). Return ONLY a JSON array of lowercase skill strings. No explanation.\n\nTranscript:\n${transcript}`
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
A matching role has been identified: ${top.role_title || "open role"}.
Role description: ${top.role_description || "N/A"}
Required skills: ${top.required_skills?.join(", ") || "N/A"}
Preferred skills: ${top.preferred_skills?.join(", ") || "N/A"}`;
  }

  try {
    const model = getGemini();
    const result = await model.generateContent(
      `You are preparing a candidate assessment challenge. Based on the candidate's background, generate a challenge appropriate for their professional function.

Candidate skills and expertise: ${candidateSkills.join(", ") || "not specified"}
${founderContext}

Phase 1 interview transcript (for context on their role and background):
${transcript.slice(0, 2000)}

Step 1 — Identify the candidate's primary function from their background and target role:
- Software / Engineering → system design (architecture, scalability, trade-offs)
- Product Management → product case study (prioritization, roadmap decisions, metrics)
- Sales / GTM / Business Development → go-to-market scenario (launch strategy, pipeline, customer acquisition)
- Marketing / Growth → marketing challenge (campaign strategy, channel mix, growth levers)
- Design / UX → design challenge (user problem framing, design decisions, trade-offs)
- Data / Analytics → data case study (analysis approach, metric design, insight extraction)
- Operations / Finance → operational problem (process design, efficiency, trade-offs)
- Other → a scenario directly relevant to their stated field and experience level

Step 2 — Generate the challenge:
- Make it directly relevant to their background and target role
- ${matchedProfileId ? "Where possible, tie it to the matching role context above" : "Base it purely on their stated background"}
- It should test real judgment and decision-making, not trivia or memorization
- It must be discussable in ~2.5 minutes with natural follow-up probes
- Match the difficulty to their stated experience level

Return ONLY the challenge text. 2-4 sentences max. No preamble, no category label, no explanation.`
    );

    const question = result.response.text().trim();
    return { question: question || FALLBACK_QUESTION, matchedFounderProfileId: matchedProfileId };
  } catch (err) {
    console.error("Question generation failed, using fallback:", err);
    return { question: FALLBACK_QUESTION, matchedFounderProfileId: null };
  }
}
