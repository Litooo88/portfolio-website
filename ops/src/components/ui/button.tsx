"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-green-400 text-[#0f1117] font-semibold hover:bg-green-300 active:bg-green-500",
        secondary:
          "bg-[#161922] text-[#f1f5f9] border border-[#1e2230] hover:bg-[#1e2230] active:bg-[#252a38]",
        destructive:
          "bg-red-400/10 text-red-400 border border-red-400/30 hover:bg-red-400/20 active:bg-red-400/25",
        ghost:
          "bg-transparent text-[#94a3b8] hover:bg-[#1e2230] hover:text-[#f1f5f9] active:bg-[#252a38]",
        outline:
          "bg-transparent text-[#f1f5f9] border border-[#1e2230] hover:bg-[#161922] hover:border-[#2a3040] active:bg-[#1e2230]",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
        default: "h-11 px-4 py-2 min-h-[44px]",
        lg: "h-12 rounded-md px-8 text-base min-h-[48px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
