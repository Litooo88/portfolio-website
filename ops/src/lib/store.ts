"use client";

import { createContext, useContext } from "react";

export type StoreRefresh = () => void;

export const RefreshContext = createContext<{
  refresh: StoreRefresh;
  tick: number;
}>({ refresh: () => {}, tick: 0 });

export function useRefresh() {
  return useContext(RefreshContext);
}
