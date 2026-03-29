import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-green-400/10 text-green-400 border border-green-400/20",
        secondary:
          "bg-[#1e2230] text-[#94a3b8] border border-[#1e2230]",
        destructive:
          "bg-red-400/10 text-red-400 border border-red-400/20",
        warning:
          "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        outline:
          "bg-transparent text-[#94a3b8] border border-[#1e2230]",
        active:
          "bg-green-400/10 text-green-400 border border-green-400/20",
        waiting:
          "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        urgent:
          "bg-red-400/10 text-red-400 border border-red-400/20",
        unpaid:
          "bg-red-400/10 text-red-400 border border-red-400/20",
        info:
          "bg-blue-400/10 text-blue-400 border border-blue-400/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
