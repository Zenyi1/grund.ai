"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { VapiCall } from "@/components/interview/vapi-call";
import {
  getCandidateBehavioralAssistant,
  getCandidateSystemDesignAssistant,
} from "@/lib/vapi/assistants";
import { resetVapi } from "@/lib/vapi/client";
import { Card, CardContent } from "@/components/ui/card";

type InterviewPhase =
  | "phase1"
  | "generating"
  | "phase2"
  | "complete";

interface CandidateInterviewClientProps {
  candidateId: string;
  resumePhase?: "generating-complete";
  existingQuestion?: string;
}

const FALLBACK_QUESTION =
  "Design a URL shortener service like bit.ly. Walk me through your architecture, how you'd handle high traffic, and how you'd store and look up the mappings.";

export function CandidateInterviewClient({
  candidateId,
  resumePhase,
  existingQuestion,
}: CandidateInterviewClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<InterviewPhase>(
    resumePhase === "generating-complete" ? "phase2" : "phase1"
  );
  const [systemDesignQuestion, setSystemDesignQuestion] = useState<string>(
    existingQuestion ?? ""
  );
  const [generatingError, setGeneratingError] = useState<string | null>(null);

  const handlePhase1End = useCallback(
    async (transcriptText: string) => {
      setPhase("generating");
      setGeneratingError(null);

      try {
        const res = await fetch("/api/interview/candidate/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: "1",
            candidateId,
            transcript: transcriptText,
          }),
        });

        const data = await res.json() as { question?: string; error?: string };
        const question = data.question ?? FALLBACK_QUESTION;

        resetVapi();
        setSystemDesignQuestion(question);
        setPhase("phase2");
      } catch (err) {
        console.error("Phase 1 submission failed:", err);
        // Use fallback so the interview can still proceed
        resetVapi();
        setSystemDesignQuestion(FALLBACK_QUESTION);
        setPhase("phase2");
      }
    },
    [candidateId]
  );

  const handlePhase2End = useCallback(
    async (transcriptText: string) => {
      setPhase("complete");

      try {
        await fetch("/api/interview/candidate/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase: "2",
            candidateId,
            transcript: transcriptText,
          }),
        });
      } catch (err) {
        console.error("Phase 2 submission failed:", err);
      }

      setTimeout(() => {
        router.refresh();
      }, 2000);
    },
    [candidateId, router]
  );

  const phase1Config = getCandidateBehavioralAssistant();
  if (phase1Config.metadata === undefined) {
    phase1Config.metadata = {};
  }
  (phase1Config.metadata as Record<string, string>).candidateId = candidateId;
  (phase1Config.metadata as Record<string, string>).phase = "1";

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-3">
        <StepIndicator
          step={1}
          label="Background"
          state={
            phase === "phase1"
              ? "active"
              : "completed"
          }
        />
        <div className="h-px flex-1 bg-gray-200" />
        <StepIndicator
          step={2}
          label="System Design"
          state={
            phase === "phase2"
              ? "active"
              : phase === "complete"
                ? "completed"
                : "pending"
          }
        />
      </div>

      {/* Phase 1: Behavioral */}
      {phase === "phase1" && (
        <VapiCall
          key="phase1"
          assistantConfig={phase1Config}
          onCallEnd={handlePhase1End}
        />
      )}

      {/* Between phases: generating question */}
      {phase === "generating" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Preparing your technical challenge
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Crafting a system design question based on your background.
                {generatingError && (
                  <span className="block text-red-500 mt-2">{generatingError}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: System Design — auto-starts, no button needed */}
      {phase === "phase2" && systemDesignQuestion && (
        <VapiCall
          key="phase2"
          autoStart
          assistantConfig={(() => {
            const config =
              getCandidateSystemDesignAssistant(systemDesignQuestion);
            if (config.metadata === undefined) {
              config.metadata = {};
            }
            (config.metadata as Record<string, string>).candidateId =
              candidateId;
            (config.metadata as Record<string, string>).phase = "2";
            return config;
          })()}
          onCallEnd={handlePhase2End}
        />
      )}

      {/* Complete */}
      {phase === "complete" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Interview Complete!
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Great job! Your responses are being evaluated and matched with
                founders. You&apos;ll receive an email if a founder wants to
                connect.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({
  step,
  label,
  state,
}: {
  step: number;
  label: string;
  state: "pending" | "active" | "completed";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
          state === "completed"
            ? "bg-primary text-primary-foreground"
            : state === "active"
              ? "bg-primary/20 text-primary border-2 border-primary"
              : "bg-gray-100 text-gray-400"
        }`}
      >
        {state === "completed" ? (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          step
        )}
      </div>
      <span
        className={`text-sm ${
          state === "active"
            ? "font-medium text-gray-900"
            : state === "completed"
              ? "text-gray-600"
              : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
