import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-[#1e2230] bg-[#161922] px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#94a3b8]/60 shadow-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#0f1117] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "autofill:bg-[#161922]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
