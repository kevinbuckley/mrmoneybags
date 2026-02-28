import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs text-secondary font-medium">{label}</label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-secondary text-sm font-mono">{prefix}</span>
          )}
          <input
            ref={ref}
            className={`w-full bg-elevated border ${error ? "border-loss" : "border-border"} rounded-lg px-3 py-2.5 text-primary text-sm font-mono focus:border-accent focus:outline-none transition-colors min-h-[44px] ${prefix ? "pl-7" : ""} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-loss">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
