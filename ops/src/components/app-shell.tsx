"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { RefreshContext } from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  NewJobContext – lets child pages open the "new job" modal          */
/* ------------------------------------------------------------------ */

interface NewJobContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

export const NewJobContext = createContext<NewJobContextValue>({
  open: false,
  setOpen: () => {},
});

export function useNewJob() {
  return useContext(NewJobContext);
}

/* ------------------------------------------------------------------ */
/*  AppShell                                                            */
/* ------------------------------------------------------------------ */

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // RefreshContext state
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // NewJobContext state
  const [newJobOpen, setNewJobOpen] = useState(false);

  return (
    <RefreshContext.Provider value={{ refresh, tick }}>
      <NewJobContext.Provider value={{ open: newJobOpen, setOpen: setNewJobOpen }}>
        {/* Desktop sidebar */}
        <DesktopSidebar />

        {/* Mobile bottom nav */}
        <MobileNav onNewClick={() => setNewJobOpen(true)} />

        {/* Main content area */}
        <main
          className="min-h-screen bg-[#0f1117] text-[#f1f5f9]
            md:pl-64
            pb-20 md:pb-0"
        >
          {children}
        </main>
      </NewJobContext.Provider>
    </RefreshContext.Provider>
  );
}
