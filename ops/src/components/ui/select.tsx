import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-11 w-full appearance-none rounded-md border border-[#1e2230] bg-[#161922] px-3 py-2 pr-9 text-sm text-[#f1f5f9] shadow-sm transition-colors cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#0f1117] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&>option]:bg-[#161922] [&>option]:text-[#f1f5f9]",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
          size={16}
        />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
