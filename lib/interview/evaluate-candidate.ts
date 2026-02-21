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
    model: "gemini-2.0-flash",
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
  "behavioral_summary": "1-2 sentence summary of background and communication quality",
  "behavioral_score": <number 0-10>,
  "system_design_summary": "1-2 sentence evaluation of technical depth and reasoning",
  "system_design_score": <number 0-10>,
  "overall_score": <number 0-10, weighted: behavioral 30% + system_design 70%>,
  "experience_years": <number or null if unclear>,
  "experience_level": "junior" | "mid" | "senior" | "lead",
  "strengths": ["up to 3 short strengths"],
  "work_style_preference": "remote" | "hybrid" | "onsite" | null
}

Scoring guide: 8-10 = exceptional, 6-7 = solid, 4-5 = average, below 4 = weak.
Be strict — most candidates score 5-7.

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
