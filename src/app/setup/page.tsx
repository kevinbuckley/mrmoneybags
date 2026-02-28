"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = ["Capital", "Scenario", "Portfolio", "Rules", "Review"];

export default function SetupPage() {
  const [step, setStep] = useState(0);

  return (
    <main className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-secondary text-sm">← Back</Link>
        <div className="flex-1 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
        <span className="text-xs text-secondary font-mono">{step + 1}/{STEPS.length}</span>
      </div>

      {/* Step label */}
      <p className="text-xs text-secondary font-medium mb-1">{STEPS[step]}</p>

      {/* Step placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-secondary text-sm">
          Step {step + 1}: {STEPS[step]} — coming in Phase 3
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 bg-elevated text-primary font-medium rounded-xl px-6 py-3 text-sm border border-border min-h-[44px]"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => {
            if (step < STEPS.length - 1) setStep(step + 1);
          }}
          className="flex-1 bg-accent text-white font-semibold rounded-xl px-6 py-3 text-sm min-h-[44px]"
        >
          {step === STEPS.length - 1 ? "Launch Simulation →" : "Next →"}
        </button>
      </div>
    </main>
  );
}
