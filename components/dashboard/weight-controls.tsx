"use client";

import { cn } from "@/lib/utils";
import type { Weights } from "@/app/founder/dashboard/types";

const PRESETS: Record<string, Weights> = {
  recommended: { skills: 35, experience: 20, culture: 15, technical: 30 },
  balanced:    { skills: 25, experience: 25, culture: 25, technical: 25 },
  "skills-first":   { skills: 55, experience: 15, culture: 5,  technical: 25 },
  "culture-first":  { skills: 20, experience: 15, culture: 50, technical: 15 },
  "technical-depth":{ skills: 20, experience: 15, culture: 5,  technical: 60 },
};

const DIMENSIONS: {
  key: keyof Weights;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    key: "skills",
    label: "Skills match",
    description: "Hard skills vs. required + preferred stack",
    color: "bg-violet-500",
  },
  {
    key: "technical",
    label: "Technical depth",
    description: "System design interview performance",
    color: "bg-blue-500",
  },
  {
    key: "experience",
    label: "Experience fit",
    description: "Seniority level and years of experience",
    color: "bg-emerald-500",
  },
  {
    key: "culture",
    label: "Culture alignment",
    description: "Work style, values, and soft factors",
    color: "bg-amber-500",
  },
];

export default function WeightControls({
  weights,
  onChange,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
}) {
  const total =
    weights.skills + weights.experience + weights.culture + weights.technical;

  function pct(val: number) {
    if (total === 0) return 25;
    return Math.round((val / total) * 100);
  }

  function handleSlider(key: keyof Weights, value: number) {
    onChange({ ...weights, [key]: value });
  }

  const activePreset = Object.entries(PRESETS).find(
    ([, v]) =>
      v.skills === weights.skills &&
      v.experience === weights.experience &&
      v.culture === weights.culture &&
      v.technical === weights.technical
  )?.[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Header + presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Match priority</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Drag sliders to weight what matters most. Top 5 candidates rerank instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(PRESETS[preset])}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors capitalize",
                activePreset === preset
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
              )}
            >
              {preset.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="grid grid-cols-[160px_1fr_44px] items-center gap-3">
            {/* Label */}
            <div>
              <p className="text-sm font-medium text-gray-700">{dim.label}</p>
              <p className="text-xs text-gray-400 leading-tight">{dim.description}</p>
            </div>

            {/* Slider */}
            <div className="relative flex items-center">
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <div className="w-full h-1.5 bg-gray-100 rounded-full">
                  <div
                    className={cn("h-1.5 rounded-full transition-all", dim.color)}
                    style={{ width: `${weights[dim.key]}%` }}
                  />
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights[dim.key]}
                onChange={(e) => handleSlider(dim.key, Number(e.target.value))}
                className="w-full relative opacity-0 h-5 cursor-pointer"
              />
            </div>

            {/* Percentage */}
            <span className="text-sm font-mono font-bold text-gray-900 text-right">
              {pct(weights[dim.key])}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
