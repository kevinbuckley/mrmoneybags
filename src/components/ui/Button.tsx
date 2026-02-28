import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-white font-semibold active:opacity-80",
  secondary: "bg-elevated text-primary font-medium border border-border active:opacity-80",
  ghost: "text-secondary hover:text-primary active:opacity-70",
  danger: "bg-loss/10 text-loss font-medium border border-loss/20 active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg min-h-[36px]",
  md: "px-6 py-3 text-sm rounded-xl min-h-[44px]",
  lg: "px-8 py-4 text-base rounded-xl min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
