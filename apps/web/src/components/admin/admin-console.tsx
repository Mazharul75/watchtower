"use client";

import { useState } from "react";
import { UsersTab } from "./users-tab";
import { OrgsTab } from "./orgs-tab";
import { FeatureFlagsTab } from "./feature-flags-tab";
import { AuditLogTab } from "./audit-log-tab";
import { SystemHealthTab } from "./system-health-tab";

const TABS = [
  { id: "health", label: "System health", component: SystemHealthTab },
  { id: "users", label: "Users", component: UsersTab },
  { id: "orgs", label: "Organizations", component: OrgsTab },
  { id: "flags", label: "Feature flags", component: FeatureFlagsTab },
  { id: "audit", label: "Audit log", component: AuditLogTab },
] as const;

export function AdminConsole() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("health");
  const ActiveComponent = TABS.find((t) => t.id === active)!.component;

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-[var(--color-brand-violet)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
