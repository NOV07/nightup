"use client";

import { createContext, useContext } from "react";
import type { Tab } from "@/app/admin/adminTabs";

/** Badge numbers the admin chrome shows. `byTab` is keyed by Tab id, but stays
 *  a loose record so a tab without a badge simply reads as undefined. */
export interface AdminCounts {
  totalPending: number;
  pendingUpgrades: number;
  publishedToday: number;
  byTab: Record<string, number>;
}

export const EMPTY_ADMIN_COUNTS: AdminCounts = {
  totalPending: 0,
  pendingUpgrades: 0,
  publishedToday: 0,
  byTab: {},
};

export interface AdminNavValue {
  activeTab: Tab;
  /** Switches tab in place on /admin, or navigates there from another admin route. */
  selectTab: (tab: Tab) => void;
  counts: AdminCounts;
  /** The main panel already holds every row it needs to count, so it publishes
   *  its own live numbers instead of letting the shell poll a second time. */
  publishCounts: (counts: AdminCounts) => void;
}

const AdminNavContext = createContext<AdminNavValue | null>(null);

export const AdminNavProvider = AdminNavContext.Provider;

export function useAdminNav(): AdminNavValue {
  const ctx = useContext(AdminNavContext);
  if (!ctx) throw new Error("useAdminNav must be used inside the /admin shell layout");
  return ctx;
}

export async function adminLogout() {
  await fetch("/api/admin/logout", { method: "POST" });
  document.cookie = "admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
