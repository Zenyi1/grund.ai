import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CandidateEvaluation {
  behavioral_summary: string;
  behavioral_score: number;
  system_design_summary: string;
  system_design_score: number;
  overall_score: number;
  experience_years: number | null;
  experience_level: "junior" | "mid" | "senior" | "lead" | null;
  strengths: string[];
  work_style_preference: string | null;
}

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({
    model: "gemini-2.5-flash",
  });
}

export async function evaluateCandidate(
  combinedTranscript: string
): Promise<CandidateEvaluation | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — skipping evaluation");
    return null;
  }

  try {
    const model = getGemini();
    const result = await model.generateContent(
      `Evaluate this two-phase interview transcript and return ONLY a JSON object with these exact fields:

{
  "behavioral_summary": "1-2 sentence summary of the candidate's background, communication quality, and overall impression from Phase 1",
  "behavioral_score": <number 0-10>,
  "system_design_summary": "1-2 sentence evaluation of the candidate's case study response in Phase 2 — assess their judgment, structure, and depth appropriate to their field (engineering, GTM, product, marketing, etc.)",
  "system_design_score": <number 0-10>,
  "overall_score": <number 0-10, weighted: behavioral 30% + case study 70%>,
  "experience_years": <number or null if unclear>,
  "experience_level": "junior" | "mid" | "senior" | "lead",
  "strengths": ["up to 3 short strengths"],
  "work_style_preference": "remote" | "hybrid" | "onsite" | null
}

Important: The Phase 2 challenge may be a system design question, a GTM case study, a product case study, a marketing challenge, or another domain-specific scenario depending on the candidate's background. Evaluate it in the context of their field — do not apply engineering standards to a sales or marketing candidate.

Scoring guide: 8-10 = exceptional, 6-7 = solid, 4-5 = average, below 4 = weak.

Transcript:
${combinedTranscript}`
    );

    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("Evaluation: no JSON found in response:", text.slice(0, 200));
      return null;
    }

    return JSON.parse(match[0]) as CandidateEvaluation;
  } catch (err) {
    console.error("Evaluation failed:", err);
    return null;
  }
}
