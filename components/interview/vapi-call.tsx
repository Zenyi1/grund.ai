"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getVapi } from "@/lib/vapi/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

type CallStatus = "idle" | "connecting" | "active" | "ended";

interface TranscriptEntry {
  role: "assistant" | "user";
  text: string;
}

interface VapiCallProps {
  assistantConfig: CreateAssistantDTO;
  onCallEnd?: () => void;
}

export function VapiCall({ assistantConfig, onCallEnd }: VapiCallProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const listenersAttached = useRef(false);

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcript, scrollToBottom]);

  useEffect(() => {
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    const vapi = getVapi();

    vapi.on("call-start", () => {
      setStatus("active");
    });

    vapi.on("call-end", () => {
      setStatus("ended");
      onCallEnd?.();
    });

    vapi.on("volume-level", (volume) => {
      setVolumeLevel(volume);
    });

    vapi.on("message", (message: Record<string, unknown>) => {
      if (
        message.type === "transcript" &&
        message.transcriptType === "final"
      ) {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role as "assistant" | "user",
            text: message.transcript as string,
          },
        ]);
      }
    });

    vapi.on("error", (error) => {
      console.error("Vapi error:", error);
    });

    return () => {
      vapi.removeAllListeners();
      listenersAttached.current = false;
    };
  }, [onCallEnd]);

  const startCall = async () => {
    setStatus("connecting");
    setTranscript([]);
    try {
      const vapi = getVapi();
      await vapi.start(assistantConfig);
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("idle");
    }
  };

  const endCall = async () => {
    const vapi = getVapi();
    await vapi.stop();
  };

  const toggleMute = () => {
    const vapi = getVapi();
    const newMuted = !isMuted;
    vapi.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  return (
    <div className="space-y-6">
      {/* Call controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    status === "active"
                      ? "bg-green-500 animate-pulse"
                      : status === "connecting"
                        ? "bg-yellow-500 animate-pulse"
                        : status === "ended"
                          ? "bg-gray-400"
                          : "bg-gray-300"
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  {status === "idle" && "Ready to start"}
                  {status === "connecting" && "Connecting..."}
                  {status === "active" && "Interview in progress"}
                  {status === "ended" && "Interview complete"}
                </span>
              </div>

              {/* Volume meter */}
              {status === "active" && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        volumeLevel > i * 0.2
                          ? "bg-green-500"
                          : "bg-gray-200"
                      }`}
                      style={{ height: `${8 + i * 4}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
              )}

              {status === "idle" && (
                <Button onClick={startCall}>Start Interview</Button>
              )}

              {(status === "connecting" || status === "active") && (
                <Button variant="destructive" onClick={endCall}>
                  End Interview
                </Button>
              )}

              {status === "ended" && (
                <span className="text-sm text-gray-500">
                  Processing your responses...
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live transcript */}
      {transcript.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Live Transcript
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${
                    entry.role === "assistant"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      entry.role === "assistant"
                        ? "bg-gray-100 text-gray-900"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <span className="block text-xs font-medium opacity-70 mb-1">
                      {entry.role === "assistant" ? "Interviewer" : "You"}
                    </span>
                    {entry.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions when idle */}
      {status === "idle" && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">
            This interview takes about 5 minutes. You&apos;ll have a
            conversation about the role you&apos;re hiring for.
          </p>
          <p className="text-gray-400 text-xs">
            Make sure your microphone is enabled and you&apos;re in a quiet
            environment.
          </p>
        </div>
      )}
    </div>
  );
}
