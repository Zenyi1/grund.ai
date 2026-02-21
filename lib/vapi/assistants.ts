import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

const BEHAVIORAL_PROMPT = `You are a fast technical screener. You have 2.5 minutes maximum.

Cover these three things in order, one question at a time:
1. Main tech stack and years of experience — get specifics (languages, frameworks, tools).
2. A recent project they built — what it does, what their role was.
3. Work preference — remote, hybrid, or onsite.

Rules:
- One question at a time. Don't combine them.
- If an answer is vague, ask one specific follow-up then move on.
- Keep it moving — redirect after 30 seconds per topic.
- No small talk, no filler.
- When you've covered all three, say exactly: "Perfect. I'm generating your technical challenge now — hang tight."`;

function buildSystemDesignPrompt(question: string): string {
  return `You are a fast technical interviewer. You have 2.5 minutes maximum.

Present this exact question to the candidate:
"${question}"

After they respond:
- Let them explain their approach (up to 60 seconds — cut them off politely if they ramble).
- Ask ONE targeted follow-up on the weakest part of their design.
- Then say: "Great, that's exactly what I needed. The interview is complete."

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
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "system", content: BEHAVIORAL_PROMPT }],
      maxTokens: 150,
      temperature: 0.5,
    },
    firstMessage:
      "Hey, let's keep this quick. What's your main technical stack and how many years have you been working with it?",
    maxDurationSeconds: 150,
  };
}

export function getCandidateSystemDesignAssistant(
  question: string
): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [
        { role: "system", content: buildSystemDesignPrompt(question) },
      ],
      maxTokens: 200,
      temperature: 0.5,
    },
    firstMessage: `Alright, here's your technical challenge: ${question} Take a moment, then walk me through how you'd approach it.`,
    maxDurationSeconds: 150,
  };
}

// Kept for the founder interview flow (used by another developer)
export function getFounderInterviewAssistant(): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
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
When you have enough info, thank them and wrap up.`,
        },
      ],
      maxTokens: 300,
      temperature: 0.7,
    },
    firstMessage:
      "Hi there! I'm here to learn about the role you're hiring for so we can find the right match. Let's start — what position are you looking to fill?",
    maxDurationSeconds: 600,
  };
}
