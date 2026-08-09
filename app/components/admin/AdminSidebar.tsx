"use client";

import { usePathname, useRouter } from "next/navigation";
import { PROFILE_TABS, PROFILE_TAB_IDS, type Tab } from "@/app/admin/adminTabs";
import { adminLogout, useAdminNav } from "./AdminNavContext";

const SECTION_LABEL_STYLE = {
  color: "rgba(255,255,255,0.2)",
  letterSpacing: "0.18em",
  fontSize: 9,
} as const;

/** The desktop admin nav. Rendered once by the /admin shell layout, so every
 *  admin route — the panel and the magazine pages — gets the same chrome. */
export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTab, selectTab, counts } = useAdminNav();

  // Magazine is a route of its own rather than a tab, so its highlight comes
  // from the pathname; every other entry keys off the active tab.
  const magazineActive = pathname.startsWith("/admin/magazine");

  function NavItem({ label, tab, badge, onClick, active }: {
    label: string; tab?: Tab; badge?: number; onClick?: () => void; active?: boolean;
  }) {
    const isActive = active ?? (tab ? activeTab === tab && !magazineActive : false);
    return (
      <button
        onClick={() => {
          if (onClick) { onClick(); return; }
          if (tab) selectTab(tab);
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left"
        style={{
          backgroundColor: isActive ? "rgba(232,160,32,0.12)" : "transparent",
          color: isActive ? "#E8A020" : "rgba(255,255,255,0.5)",
        }}
      >
        <span>{label}</span>
        {!!badge && badge > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold leading-none" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 overflow-y-auto"
      style={{ width: 220, backgroundColor: "#0A0A12", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-widest text-sm" style={{ letterSpacing: "0.18em" }}>NIGHTUP</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: "rgba(232,160,32,0.15)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>Admin</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-3 mb-4 p-3 rounded-xl space-y-2" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { label: "Pending approval", value: counts.totalPending,    color: counts.totalPending > 0 ? "#E8A020" : "#555" },
          { label: "Upgrade requests", value: counts.pendingUpgrades, color: counts.pendingUpgrades > 0 ? "#F87171" : "#555" },
          { label: "Published today",  value: counts.publishedToday,  color: counts.publishedToday > 0 ? "#34D399" : "#555" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>{label}</span>
            <span className="font-bold text-xs" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="px-3 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest mb-2 pl-1" style={SECTION_LABEL_STYLE}>Moderation</p>
        <NavItem label="Queue"    tab="queue"    badge={counts.byTab.queue} />
        <NavItem label="Upgrades" tab="upgrades" badge={counts.byTab.upgrades} />
        <NavItem label="Featured" tab="featured" badge={counts.byTab.featured} />
        <NavItem label="Spot Claims" tab="spot-claims" badge={counts.byTab["spot-claims"]} />
        <NavItem label="Users"    tab="users" />

        <p className="text-xs font-bold uppercase tracking-widest mt-5 mb-2 pl-1" style={SECTION_LABEL_STYLE}>Content</p>
        <NavItem label="Events"     tab="events" badge={counts.byTab.events} />
        <NavItem label="Nightwaves" tab="music"  badge={counts.byTab.music} />
        <NavItem label="Spots"      tab="spots"  badge={counts.byTab.spots} />
        {/* No badge: listings have no pending state to count. */}
        <NavItem label="Listings"   tab="listings" />
        <NavItem label="Magazine"   active={magazineActive} onClick={() => router.push("/admin/magazine")} />

        <p className="text-xs font-bold uppercase tracking-widest mt-5 mb-2 pl-1" style={SECTION_LABEL_STYLE}>People</p>
        {PROFILE_TAB_IDS.map(id => (
          <NavItem key={id} label={PROFILE_TABS[id].label} tab={id} />
        ))}
      </div>

      {/* Utilities */}
      <div className="p-3 border-t mt-4 space-y-0.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {/* New tab on purpose: this is for checking a change against the live
            site without losing your place in the panel. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-xs px-3 py-2 rounded-lg text-left transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          View site ↗
        </a>
        <button
          onClick={async () => { await adminLogout(); router.refresh(); }}
          className="w-full text-xs px-3 py-2 rounded-lg text-left transition-opacity hover:opacity-80"
          style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.3)" }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
