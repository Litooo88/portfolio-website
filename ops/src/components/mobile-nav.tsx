"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  Plus,
  FileText,
  Menu,
  Database,
  Lightbulb,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  onNewClick?: () => void;
}

const primaryItems = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/jobb", label: "Jobb", icon: Briefcase },
  // center "Ny" button handled separately
  { href: "/offert", label: "Offert", icon: FileText },
];

const overflowItems = [
  { href: "/prisdatabas", label: "Prisdatabas", icon: Database },
  { href: "/innehall", label: "Innehållsidéer", icon: Lightbulb },
  { href: "/installningar", label: "Inställningar", icon: Settings },
];

export function MobileNav({ onNewClick }: MobileNavProps) {
  const pathname = usePathname();
  const [merOpen, setMerOpen] = useState(false);

  const isOverflowActive = overflowItems.some((item) =>
    pathname.startsWith(item.href)
  );

  return (
    <>
      {/* Overflow popup */}
      {merOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMerOpen(false)}
          />
          {/* Menu panel */}
          <div className="fixed bottom-20 right-3 z-50 md:hidden bg-[#161922] border border-[#1e2230] rounded-xl shadow-2xl overflow-hidden w-52">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2230]">
              <span className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">
                Mer
              </span>
              <button
                onClick={() => setMerOpen(false)}
                className="text-[#94a3b8] hover:text-[#f1f5f9] transition-colors p-0.5 rounded"
                aria-label="Stäng meny"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="py-1">
              {overflowItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "text-green-400 bg-green-400/10"
                        : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1e2230]"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#161922] border-t border-[#1e2230] flex items-center justify-around px-2 h-16 safe-area-inset-bottom">
        {/* Hem */}
        {primaryItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors",
                isActive
                  ? "text-green-400"
                  : "text-[#94a3b8] hover:text-[#f1f5f9]"
              )}
              aria-label={label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}

        {/* Ny — center prominent button */}
        <button
          onClick={onNewClick}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-green-400 hover:bg-green-300 active:scale-95 transition-all shadow-lg shadow-green-400/20 shrink-0"
          aria-label="Ny"
        >
          <Plus className="w-6 h-6 text-[#0f1117]" strokeWidth={2.5} />
        </button>

        {/* Offert */}
        {primaryItems.slice(2).map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors",
                isActive
                  ? "text-green-400"
                  : "text-[#94a3b8] hover:text-[#f1f5f9]"
              )}
              aria-label={label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}

        {/* Mer */}
        <button
          onClick={() => setMerOpen((prev) => !prev)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors",
            isOverflowActive || merOpen
              ? "text-green-400"
              : "text-[#94a3b8] hover:text-[#f1f5f9]"
          )}
          aria-label="Mer"
          aria-expanded={merOpen}
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] font-medium leading-none">Mer</span>
        </button>
      </nav>
    </>
  );
}
