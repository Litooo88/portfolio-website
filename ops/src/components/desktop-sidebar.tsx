"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Users,
  FileText,
  Database,
  Lightbulb,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Instrumentpanel", icon: LayoutDashboard },
  { href: "/jobb", label: "Kunder & Jobb", icon: Users },
  { href: "/offert", label: "Offert", icon: FileText },
  { href: "/prisdatabas", label: "Prisdatabas", icon: Database },
  { href: "/innehall", label: "Innehållsidéer", icon: Lightbulb },
  { href: "/installningar", label: "Inställningar", icon: Settings },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#161922] border-r border-[#1e2230] z-40">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e2230]">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-400/10">
          <Zap className="w-5 h-5 text-green-400" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[#f1f5f9] text-sm font-semibold tracking-tight">
            Nordic E-Mobility
          </span>
          <span className="text-[#94a3b8] text-xs">Verkstadsystem</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group",
                isActive
                  ? "bg-green-400/10 text-green-400 border-l-2 border-green-400 pl-[10px]"
                  : "text-[#94a3b8] hover:bg-[#1e2230] hover:text-[#f1f5f9] border-l-2 border-transparent pl-[10px]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-green-400"
                    : "text-[#94a3b8] group-hover:text-[#f1f5f9]"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1e2230]">
        <p className="text-[#94a3b8] text-xs">v1.0 · Nordic E-Mobility</p>
      </div>
    </aside>
  );
}
