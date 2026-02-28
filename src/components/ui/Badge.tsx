import { type HTMLAttributes } from "react";

type BadgeVariant = "gain" | "loss" | "neutral" | "accent" | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  gain: "bg-gain/10 text-gain",
  loss: "bg-loss/10 text-loss",
  neutral: "bg-border text-secondary",
  accent: "bg-accent/20 text-accent",
  default: "bg-elevated text-secondary",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
