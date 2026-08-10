"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PROFILE_TABS, PROFILE_TAB_IDS, isTab, type Tab } from "@/app/admin/adminTabs";
import AdminSidebar from "./AdminSidebar";
import {
  AdminNavProvider,
  EMPTY_ADMIN_COUNTS,
  adminLogout,
  type AdminCounts,
  type AdminNavValue,
} from "./AdminNavContext";

/** Two-column chrome shared by every authenticated /admin route: sidebar on the
 *  left, route content on the right, plus the mobile nav. The active tab lives
 *  here so the sidebar can drive the panel from routes that are not the panel. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<Tab>(() => (isTab(tabParam) ? tabParam : "queue"));
  const [counts, setCounts] = useState<AdminCounts>(EMPTY_ADMIN_COUNTS);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // The shell is not remounted when moving between /admin and /admin/magazine,
  // so the initial state above only covers a cold load — pick the handoff up
  // from the query param on every navigation too.
  useEffect(() => {
    if (isTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  // Badge numbers. The panel publishes its own live counts (it already holds
  // every row), so only routes without that data pay for the counts endpoint.
  const panelOwnsCounts = useRef(false);
  const publishCounts = useCallback((next: AdminCounts) => {
    panelOwnsCounts.current = true;
    setCounts(next);
  }, []);

  useEffect(() => {
    if (panelOwnsCounts.current) return;
    let cancelled = false;
    fetch("/api/admin/counts")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || panelOwnsCounts.current || !data) return;
        setCounts({
          totalPending: data.totalPending ?? 0,
          pendingUpgrades: data.pendingUpgrades ?? 0,
          publishedToday: data.publishedToday ?? 0,
          byTab: data.byTab ?? {},
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  const selectTab = useCallback((tab: Tab) => {
    setMobileDrawerOpen(false);
    if (pathname === "/admin") { setActiveTab(tab); return; }
    router.push(`/admin?tab=${tab}`);
  }, [pathname, router]);

  const navValue: AdminNavValue = useMemo(
    () => ({ activeTab, selectTab, counts, publishCounts }),
    [activeTab, selectTab, counts, publishCounts]
  );

  const onMagazine = pathname.startsWith("/admin/magazine");

  return (
    <AdminNavProvider value={navValue}>
      <div style={{ backgroundColor: "#0F0F1A", color: "#fff", minHeight: "100vh" }}>
        <div className="flex md:h-screen md:overflow-hidden">

          <AdminSidebar />

          {/* min-w-0: a flex item defaults to min-width:auto, so without this
              any wide row inside pushes main past the viewport and clips its
              right edge on phones. */}
          <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto">
            {/* Mobile header */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", backgroundColor: "#0A0A12" }}>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-widest text-sm" style={{ letterSpacing: "0.14em" }}>NIGHTUP</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(232,160,32,0.15)", color: "#E8A020" }}>Admin</span>
              </div>
              {counts.totalPending > 0 && (
                <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
                  {counts.totalPending} pending
                </span>
              )}
            </div>

            {children}
          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────────── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
          style={{ backgroundColor: "#0A0A12", borderColor: "rgba(255,255,255,0.07)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {([
            { tab: "queue"  as Tab, label: "Queue",  icon: "⏳", badge: counts.totalPending },
            { tab: "events" as Tab, label: "Events", icon: "📅", badge: 0 },
            { tab: "music"  as Tab, label: "Waves",  icon: "🎵", badge: counts.byTab.music },
            { tab: "users"  as Tab, label: "Users",  icon: "👤", badge: 0 },
          ]).map(({ tab, label, icon, badge }) => (
            <button
              key={tab}
              onClick={() => selectTab(tab)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative transition-opacity"
              style={{ color: activeTab === tab && !onMagazine ? "#E8A020" : "rgba(255,255,255,0.35)" }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.06em" }}>{label}</span>
              {!!badge && badge > 0 && (
                <span className="absolute top-2 right-1/4 text-xs px-1 rounded-full font-bold leading-none" style={{ backgroundColor: "#E8A020", color: "#0F0F1A", fontSize: 8, padding: "2px 4px" }}>{badge}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-opacity"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <span style={{ fontSize: 18 }}>···</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.06em" }}>More</span>
          </button>
        </nav>

        {/* ── MOBILE DRAWER ─────────────────────────────────────────────────── */}
        {mobileDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <div
              className="rounded-t-2xl p-5 space-y-1"
              style={{ backgroundColor: "#0F0F1A", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
              {([
                { tab: "spots"    as Tab, label: "Spots",    badge: counts.byTab.spots },
                { tab: "users"    as Tab, label: "Users",    badge: 0 },
                { tab: "upgrades" as Tab, label: "Upgrades", badge: counts.byTab.upgrades },
                { tab: "featured" as Tab, label: "Featured", badge: counts.byTab.featured },
                { tab: "spot-claims" as Tab, label: "Spot Claims", badge: counts.byTab["spot-claims"] },
                ...PROFILE_TAB_IDS.map(id => ({ tab: id as Tab, label: PROFILE_TABS[id].label, badge: 0 })),
              ]).map(({ tab, label, badge }) => (
                <button
                  key={tab}
                  onClick={() => selectTab(tab)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-opacity"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}
                >
                  <span>{label}</span>
                  {!!badge && badge > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{badge}</span>}
                </button>
              ))}
              <button
                onClick={() => { router.push("/admin/magazine"); setMobileDrawerOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}
              >Magazine</button>
              <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <button
                  onClick={async () => { await adminLogout(); router.refresh(); }}
                  className="w-full px-4 py-3 rounded-xl text-sm text-left"
                  style={{ color: "rgba(248,113,113,0.7)" }}
                >Sign out</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminNavProvider>
  );
}
