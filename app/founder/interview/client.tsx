"use client";

import { useRouter } from "next/navigation";
import { VapiCall } from "@/components/interview/vapi-call";
import { getFounderInterviewAssistant } from "@/lib/vapi/assistants";

interface FounderInterviewClientProps {
  founderId: string;
}

export function FounderInterviewClient({
  founderId,
}: FounderInterviewClientProps) {
  const router = useRouter();

  const assistantConfig = getFounderInterviewAssistant();

  if (assistantConfig.metadata === undefined) {
    assistantConfig.metadata = {};
  }
  (assistantConfig.metadata as Record<string, string>).founderId = founderId;

  const handleCallEnd = () => {
    setTimeout(() => {
      router.refresh();
    }, 3000);
  };

  return <VapiCall assistantConfig={assistantConfig} onCallEnd={handleCallEnd} />;
}
