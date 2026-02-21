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
  /** Called when the call ends. Receives the full transcript as plain text. */
  onCallEnd?: (transcriptText: string) => void;
  /** When true, the call starts automatically on mount (no button needed). */
  autoStart?: boolean;
}

export function VapiCall({ assistantConfig, onCallEnd, autoStart = false }: VapiCallProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Keep onCallEnd in a ref so the stable effect closure always has the latest version
  const onCallEndRef = useRef(onCallEnd);
  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // Keep assistantConfig in a ref so the message handler can read endCallPhrases
  const assistantConfigRef = useRef(assistantConfig);
  useEffect(() => {
    assistantConfigRef.current = assistantConfig;
  }, [assistantConfig]);

  // Track whether this component instance actually started a call.
  // Prevents leftover "call-end" from a previous phase firing onCallEnd.
  const callStartedRef = useRef(false);
  // Suppress errors that fire after the call has ended (Vapi cleanup noise).
  const callEndedRef = useRef(false);

  // Mirror transcript state in a ref so the listener closure can read it
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  const scrollToBottom = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcript, scrollToBottom]);

  // Register Vapi event listeners once per component mount
  useEffect(() => {
    const vapi = getVapi();

    const handleCallStart = () => {
      callStartedRef.current = true;
      setStatus("active");
    };

    const handleCallEnd = () => {
      if (!callStartedRef.current || callEndedRef.current) return;
      callEndedRef.current = true;
      setStatus("ended");
      // Build plain-text transcript and pass it to the callback
      const transcriptText = transcriptRef.current
        .map((e) => `${e.role}: ${e.text}`)
        .join("\n");
      onCallEndRef.current?.(transcriptText);
    };

    const handleVolumeLevel = (volume: number) => {
      setVolumeLevel(volume);
    };

    const handleMessage = (message: Record<string, unknown>) => {
      if (
        message.type === "transcript" &&
        message.transcriptType === "final"
      ) {
        const text = message.transcript as string;
        const role = message.role as "assistant" | "user";
        setTranscript((prev) => {
          // Deduplicate: skip if the last entry is identical
          const last = prev[prev.length - 1];
          if (last && last.role === role && last.text === text) return prev;
          const next = [...prev, { role, text }];
          transcriptRef.current = next; // keep ref in sync for the call-end handler
          return next;
        });

        // Client-side safety net: if Vapi cloud misses the endCallPhrase, we end the
        // call ourselves the moment we see it in the assistant's transcript.
        if (role === "assistant" && !callEndedRef.current) {
          const phrases = (assistantConfigRef.current.endCallPhrases as string[] | undefined) ?? [];
          const lower = text.toLowerCase();
          if (phrases.some((p) => lower.includes(p.toLowerCase()))) {
            try {
              vapi.stop();
            } catch {
              // Already stopped — ignore
            }
          }
        }
      }
    };

    const handleError = (error: unknown) => {
      // Suppress all errors once the call has ended (Vapi cleanup noise)
      if (callEndedRef.current) return;
      // "Meeting ended due to ejection" is normal when maxDurationSeconds is hit
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("ejection") || msg.includes("Meeting has ended")) return;
      console.error("Vapi error:", error);
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("volume-level", handleVolumeLevel);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    return () => {
      vapi.off("call-start", handleCallStart);
      vapi.off("call-end", handleCallEnd);
      vapi.off("volume-level", handleVolumeLevel);
      vapi.off("message", handleMessage);
      vapi.off("error", handleError);
    };
  }, []); // Run once per component instance

  const startCall = useCallback(async () => {
    setStatus("connecting");
    setTranscript([]);
    callStartedRef.current = false;
    callEndedRef.current = false;
    try {
      const vapi = getVapi();
      await vapi.start(assistantConfig);
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("idle");
    }
  }, [assistantConfig]);

  // Auto-start: fire startCall shortly after mount (gives Vapi time to initialize)
  useEffect(() => {
    if (!autoStart) return;
    const timer = setTimeout(startCall, 600);
    return () => clearTimeout(timer);
  }, [autoStart, startCall]);

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
                  {status === "idle" && (autoStart ? "Starting..." : "Ready to start")}
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

              {/* Only show Start button when not auto-starting */}
              {status === "idle" && !autoStart && (
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

      {/* Instructions when idle and not auto-starting */}
      {status === "idle" && !autoStart && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">
            This interview takes about 5 minutes total — a quick background
            check followed by a technical challenge.
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
