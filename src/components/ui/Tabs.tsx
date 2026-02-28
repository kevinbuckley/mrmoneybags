"use client";

import { type ReactNode } from "react";

interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all min-h-[36px] ${
            value === tab.value
              ? "bg-accent text-white"
              : "text-secondary hover:text-primary"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
