import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

const BEHAVIORAL_PROMPT = `You are a career screener. Collect the information below as efficiently as possible. No small talk, no pleasantries.

Cover these five areas in order, one at a time:
1. Target role and background — what kind of role are they looking for and what do they do?
2. Main skills or areas of expertise — get specifics (tools, languages, domains, methods — whatever fits their field).
3. Experience — total years and how they'd describe their level (early-career, mid-level, senior, or lead).
4. A recent achievement — a project or result they're proud of and what their specific role was.
5. Work preference — remote, hybrid, or onsite?

Rules:
- One question at a time. Wait for each answer before continuing.
- No compliments, no filler phrases.
- If an answer is vague, ask one specific follow-up then move on.
- Even if the candidate volunteers answers to upcoming areas, still explicitly confirm each one.
- Do NOT end the call until you have received answers to ALL FIVE areas.
- When all five are covered, say exactly: "Perfect. Stand by while I prepare your next question."`;

function buildSystemDesignPrompt(question: string): string {
  return `You are conducting a case study assessment. You have 2.5 minutes maximum.

Present this challenge to the candidate:
"${question}"

After they respond:
- Let them walk through their approach (up to 60 seconds — redirect politely if they ramble).
- Ask ONE targeted follow-up that probes the weakest or least-developed part of their answer.
- Then say exactly: "Great, that's exactly what I needed. The interview is complete."

Rules:
- Only one follow-up question total.
- Do not ask unrelated questions.
- Be direct and move fast.`;
}

const SHARED_VAPI_CONFIG = {
  voice: {
    provider: "vapi" as const,
    voiceId: "Elliot" as const,
  },
  firstMessageMode: "assistant-speaks-first" as const,
  backgroundSound: "off",
  serverMessages: ["end-of-call-report"] as unknown as CreateAssistantDTO["serverMessages"],
  clientMessages: ["transcript", "speech-update", "status-update"] as unknown as CreateAssistantDTO["clientMessages"],
};

export function getCandidateBehavioralAssistant(): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "google",
      model: "gemini-2.0-flash",
      messages: [{ role: "system", content: BEHAVIORAL_PROMPT }],
      maxTokens: 200,
      temperature: 0.5,
    } as CreateAssistantDTO["model"],
    firstMessage:
      "What type of role are you looking for, and what's your background?",
    // Vapi ends the call automatically when the assistant speaks this phrase
    endCallPhrases: ["Stand by while I prepare your technical question"] as unknown as CreateAssistantDTO["endCallPhrases"],
    maxDurationSeconds: 150,
  };
}

export function getCandidateSystemDesignAssistant(
  question: string
): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "google",
      model: "gemini-2.0-flash",
      messages: [
        { role: "system", content: buildSystemDesignPrompt(question) },
      ],
      maxTokens: 200,
      temperature: 0.5,
    } as CreateAssistantDTO["model"],
    firstMessage: `Here's your challenge: ${question} Take a moment if you need, then walk me through how you'd approach it.`,
    // Vapi ends the call automatically when the assistant speaks this phrase
    endCallPhrases: ["The interview is complete"] as unknown as CreateAssistantDTO["endCallPhrases"],
    maxDurationSeconds: 150,
  };
}

// Kept for the founder interview flow (used by another developer)
export function getFounderInterviewAssistant(): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "google",
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are interviewing a startup founder to understand their hiring needs.
Keep it conversational, ~5 minutes. Cover:
1. What role are you hiring for? Title and responsibilities.
2. Must-have technical skills (be specific: languages, frameworks, tools).
3. Nice-to-have skills.
4. Experience level needed and why.
5. Work arrangement (remote/hybrid/onsite).
6. Team culture and values — what kind of person thrives here?
7. Any deal-breakers?

Ask follow-up questions to get specifics. Don't accept vague answers like "good communicator" — dig into what that means for them.
When you have enough info, say: "Thanks so much — I have everything I need."`,
        },
      ],
      maxTokens: 300,
      temperature: 0.7,
    } as CreateAssistantDTO["model"],
    firstMessage:
      "Hi there! I'm here to learn about the role you're hiring for so we can find the right match. Let's start — what position are you looking to fill?",
    endCallPhrases: ["I have everything I need"] as unknown as CreateAssistantDTO["endCallPhrases"],
    maxDurationSeconds: 600,
  };
}
