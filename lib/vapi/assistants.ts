import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

const FOUNDER_SYSTEM_PROMPT = `You are interviewing a startup founder to understand their hiring needs.
Keep it conversational, ~5 minutes. Cover:
1. What role are you hiring for? Title and responsibilities.
2. Must-have technical skills (be specific: languages, frameworks, tools).
3. Nice-to-have skills.
4. Experience level needed and why.
5. Work arrangement (remote/hybrid/onsite).
6. Team culture and values — what kind of person thrives here?
7. Any deal-breakers?

Ask follow-up questions to get specifics. Don't accept vague answers like "good communicator" — dig into what that means for them.
When you have enough info, thank them and wrap up.`;

const CANDIDATE_BEHAVIORAL_PROMPT = `You are conducting a behavioral interview for a tech candidate.
Keep it conversational, ~4 minutes. Cover:
1. Walk me through your background briefly.
2. What technologies do you work with most? Get specific versions/tools.
3. Tell me about a challenging project. What was your role?
4. How do you approach debugging/problem-solving?
5. What's your preferred work style?
6. What are you looking for in your next role?

Dig deeper on technical claims. If they say "I know TypeScript", ask about specific patterns, challenges, or projects.
When you have enough info, wrap up and let them know the next part will begin shortly.`;

function buildSystemDesignPrompt(question: string): string {
  return `You are conducting the system design phase of a technical interview.

Present this question to the candidate:
"${question}"

After presenting the question:
1. Let the candidate think and start explaining their approach.
2. Ask follow-up questions to probe depth: "How would you handle X?", "What happens when Y fails?", "Why did you choose Z over alternatives?"
3. Push on trade-offs — there are no perfect designs.
4. If they get stuck, give a small hint and see how they recover.
5. Keep it conversational, ~5 minutes total.

When you have enough signal on their design thinking, thank them and wrap up.`;
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

export function getFounderInterviewAssistant(): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "system", content: FOUNDER_SYSTEM_PROMPT }],
      maxTokens: 300,
      temperature: 0.7,
    },
    firstMessage:
      "Hi there! I'm here to learn about the role you're hiring for so we can find the right match. Let's start — what position are you looking to fill?",
    maxDurationSeconds: 600,
  };
}

export function getCandidateBehavioralAssistant(): CreateAssistantDTO {
  return {
    ...SHARED_VAPI_CONFIG,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "system", content: CANDIDATE_BEHAVIORAL_PROMPT }],
      maxTokens: 300,
      temperature: 0.7,
    },
    firstMessage:
      "Hey! Welcome to your interview. I'll start by learning about your background and experience, and then we'll move into a technical discussion. Sound good? Tell me a bit about yourself and your journey in tech.",
    maxDurationSeconds: 420,
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
      maxTokens: 400,
      temperature: 0.7,
    },
    firstMessage: `Great, let's move into the technical portion. Here's a system design question for you: ${question}. Take a moment to think about it, and then walk me through your approach.`,
    maxDurationSeconds: 420,
  };
}
