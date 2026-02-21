"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { VapiCall } from "@/components/interview/vapi-call";
import { getFounderInterviewAssistant } from "@/lib/vapi/assistants";
import { Card, CardContent } from "@/components/ui/card";

type SubmitState = "idle" | "submitting" | "done" | "error";

export function FounderInterviewClient() {
  const router = useRouter();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const handleCallEnd = useCallback(
    async (transcriptText: string) => {
      setSubmitState("submitting");

      try {
        const res = await fetch("/api/interview/founder/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: transcriptText }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Founder extract failed:", data);
          setSubmitState("error");
          return;
        }

        setSubmitState("done");
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } catch (err) {
        console.error("Founder submit failed:", err);
        setSubmitState("error");
      }
    },
    [router]
  );

  const assistantConfig = getFounderInterviewAssistant();

  return (
    <div className="space-y-6">
      {(submitState === "idle" || submitState === "error") && (
        <VapiCall
          assistantConfig={assistantConfig}
          onCallEnd={handleCallEnd}
        />
      )}

      {submitState === "submitting" && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Building your hiring profile
              </h3>
              <p className="text-sm text-gray-500">
                Analyzing your interview responses...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {submitState === "done" && (
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
                Profile saved!
              </h3>
              <p className="text-sm text-gray-500">
                Redirecting to your dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {submitState === "error" && (
        <p className="text-sm text-red-500 text-center">
          Something went wrong saving your profile. Please try again or contact support.
        </p>
      )}
    </div>
  );
}
