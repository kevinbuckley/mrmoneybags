import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = true, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-surface rounded-xl border border-border ${padding ? "p-4" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
