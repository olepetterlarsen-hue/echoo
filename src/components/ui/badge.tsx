import type { HTMLAttributes } from "react";

type Tone = "neutral" | "orange" | "blue" | "green" | "red" | "yellow";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  neutral: "bg-card-hover text-text-1 border-border-strong",
  orange: "bg-orange/10 text-orange border-orange/30",
  blue: "bg-blue/10 text-blue-soft border-blue/30",
  green: "bg-green/10 text-green border-green/30",
  red: "bg-red/10 text-red border-red/30",
  yellow: "bg-yellow/10 text-yellow border-yellow/30",
};

export function Badge({ className = "", tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
