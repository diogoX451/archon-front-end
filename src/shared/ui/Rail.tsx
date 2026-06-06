import { NavLink, useLocation } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "@app/auth-context";
import { useConfirm } from "@shared/ui/feedback";
import { canAny } from "@shared/authz";
import { useEffect, useState } from "react";
import {
  IconOverview,
  IconConversation,
  IconWorkflows,
  IconAgents,
  IconExecutions,
  IconRAG,
  IconProfiles,
  type IconProps,
} from "./icons/Icons";

// Tenant icon (building)
export const IconTenants = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 21V7h6v14" />
    <path d="M8 7h8" />
    <path d="M8 11h2M14 11h2M8 15h2M14 15h2" />
  </svg>
);

// Roles icon (shield-check)
export const IconRoles = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// Permissions icon (key)
export const IconPermissions = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M17 6l3 3" />
    <path d="M15 8l3 3" />
  </svg>
);

// Channels icon (signal / antenna)
export const IconChannels = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5a7 7 0 0 1 14 0" />
    <path d="M2 9a11 11 0 0 1 20 0" />
    <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <line x1="12" y1="18.5" x2="12" y2="22" />
  </svg>
);

// LLM Config icon (cpu chip)
export const IconLLMConfig = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="7" width="10" height="10" rx="1" />
    <path d="M7 9H5M7 12H5M7 15H5M17 9h2M17 12h2M17 15h2M9 7V5M12 7V5M15 7V5M9 17v2M12 17v2M15 17v2" />
  </svg>
);

// MCP icon: three nodes connected to a hub
export const IconMCPConfig = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="12" cy="20" r="2" />
    <path d="M7 7l3 3M17 7l-3 3M12 15v3" />
  </svg>
);

// Audit icon (calendar with lines)
export const IconAudit = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h2M8 18h5" />
  </svg>
);

// Observability icon (activity chart)
export const IconObservability = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

// Billing icon (credit card / plan)
export const IconBilling = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
);

// Privacy icon (shield + user)
export const IconPrivacy = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <circle cx="12" cy="11" r="2" />
    <path d="M9.5 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2" />
  </svg>
);

// Handoffs icon (user with arrow handoff)
export const IconHandoffs = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 11l3 3 3-3" />
    <path d="M19 14V8" />
  </svg>
);

export const IconCRM = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <circle cx="9" cy="10" r="2" />
    <path d="M15 8h2M15 12h2" />
  </svg>
);

export const IconCard = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

// Logout icon
export const IconLogout = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

type RailGroup = "main" | "observe" | "config" | "admin" | "account";

type RailLink = {
  to: string;
  labelKey: string;
  icon: (p: IconProps) => JSX.Element;
  exact?: boolean;
  superOnly?: boolean;
  perms?: string[];
  tourTarget?: string;
  group: RailGroup;
};

const GROUP_LABELS: Record<RailGroup, string> = {
  main: "",
  observe: "Observabilidade",
  config: "Configuração",
  admin: "Admin",
  account: "Conta",
};

const links: RailLink[] = [
  // Main — core daily actions
  { to: "/dashboard",       labelKey: "nav.overview",     icon: IconOverview,     group: "main" },
  { to: "/conversation",    labelKey: "nav.conversation",  icon: IconConversation, group: "main" },
  { to: "/handoffs",        labelKey: "nav.handoffs",      icon: IconHandoffs,     perms: ["workflow_list", "conversation_turn"], group: "main" },
  { to: "/crm/contacts",   labelKey: "nav.crmContacts",    icon: IconCRM,          group: "main" },
  { to: "/crm/cards",      labelKey: "nav.crmCards",       icon: IconCard,         group: "main" },
  // { to: "/workflows",       labelKey: "nav.workflows",     icon: IconWorkflows,    perms: ["workflow_list"], tourTarget: "nav-workflows", group: "main" },
  { to: "/templates",       labelKey: "nav.agents",        icon: IconAgents,       perms: ["conversation_profile_list"], tourTarget: "nav-agents", group: "main" },
  // Observe — monitoring & knowledge
  // { to: "/events",          labelKey: "nav.executions",    icon: IconExecutions,   perms: ["workflow_list"], tourTarget: "nav-events", group: "observe" },
  { to: "/rag",             labelKey: "nav.rag",           icon: IconRAG,          perms: ["rag_read", "rag_query", "rag_ingest"], tourTarget: "nav-rag", group: "observe" },
  { to: "/observability",  labelKey: "nav.observability", icon: IconObservability, perms: ["workflow_list"], group: "observe" },
  // Config — integrations & models
  { to: "/channels",        labelKey: "nav.channels",      icon: IconChannels,     perms: ["channel_manage"], group: "config" },
  { to: "/llm-config",      labelKey: "nav.llmConfig",     icon: IconLLMConfig,    perms: ["channel_manage"], group: "config" },
  { to: "/mcp-config",      labelKey: "nav.mcpServers",    icon: IconMCPConfig,    perms: ["mcp_admin"], group: "config" },
  // Admin — users, permissions, tenants
  { to: "/profiles",        labelKey: "nav.users",         icon: IconProfiles,     perms: ["user_list"], group: "admin" },
  { to: "/roles",           labelKey: "nav.roles",         icon: IconRoles,        perms: ["role_list"], group: "admin" },
  { to: "/permissions",     labelKey: "nav.permissions",   icon: IconPermissions,  superOnly: true, perms: ["permission_list"], group: "admin" },
  { to: "/tenants",         labelKey: "nav.tenants",       icon: IconTenants,      superOnly: true, group: "admin" },
  { to: "/admin-audit",     labelKey: "nav.auditLog",      icon: IconAudit,        superOnly: true, group: "admin" },
  // Account
  { to: "/account/privacy", labelKey: "nav.myPrivacy",     icon: IconPrivacy,      group: "account" },
  { to: "/account/billing", labelKey: "nav.myBilling",     icon: IconBilling,      group: "account" },
];

const RAIL_W_COLLAPSED = 56;
const RAIL_W_EXPANDED  = 208;

function initialsFromUser(name?: string, email?: string): string {
  const source = (name || "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : (parts[0]?.[1] || "");
    const out = `${first}${second}`.toUpperCase();
    return out || "US";
  }
  const mail = (email || "").trim();
  if (mail) return mail.slice(0, 2).toUpperCase();
  return "US";
}

export function Rail() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isSuper, hasPermission, logout } = useAuth();
  const confirm = useConfirm();

  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      if (localStorage.getItem("rail-v") !== "2") {
        localStorage.removeItem("rail-expanded");
        localStorage.setItem("rail-v", "2");
      }
      const v = localStorage.getItem("rail-expanded");
      return v === null ? true : v === "true";
    } catch { return true; }
  });

  useEffect(() => {
    const w = expanded ? RAIL_W_EXPANDED : RAIL_W_COLLAPSED;
    document.documentElement.style.setProperty("--rail-w", `${w}px`);
    try { localStorage.setItem("rail-expanded", String(expanded)); } catch { /* noop */ }
  }, [expanded]);

  // Set initial CSS var synchronously before first paint
  useEffect(() => {
    const w = expanded ? RAIL_W_EXPANDED : RAIL_W_COLLAPSED;
    document.documentElement.style.setProperty("--rail-w", `${w}px`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = (link: RailLink) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname === link.to || location.pathname.startsWith(link.to + "/");
  };

  const visibleLinks = links.filter((link) => {
    if (link.superOnly && !isSuper) return false;
    if (!link.perms || link.perms.length === 0) return true;
    return canAny({ isSuper, hasPermission }, link.perms);
  });

  // Group consecutive items with same group id
  const grouped: Array<{ groupId: RailGroup; items: RailLink[] }> = [];
  for (const link of visibleLinks) {
    const last = grouped[grouped.length - 1];
    if (last && last.groupId === link.group) {
      last.items.push(link);
    } else {
      grouped.push({ groupId: link.group, items: [link] });
    }
  }

  return (
    <aside className="rail" data-expanded={expanded ? "true" : "false"}>
      {/* Brand row with toggle */}
      <div className="rail-brand-row">
        <div className="rail-brand" aria-hidden="true" />
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Recolher menu" : "Expandir menu"}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 220ms" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <nav className="rail-nav">
        {grouped.map(({ groupId, items }, gi) => (
          <div key={groupId + gi} className="rail-group">
            {expanded && groupId !== "main" && (
              <div className="rail-group-label">{GROUP_LABELS[groupId]}</div>
            )}
            {!expanded && gi > 0 && <div className="rail-divider" />}
            {items.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className="rail-link"
                data-active={isActive(link) ? "true" : undefined}
                data-tour={link.tourTarget}
              >
                <span className="rail-icon"><link.icon size={18} /></span>
                {expanded
                  ? <span className="rail-label">{t(link.labelKey)}</span>
                  : <span className="tip">{t(link.labelKey)}</span>
                }
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="rail-footer">
        <div
          className="rail-avatar"
          title={user ? `${user.name} (${user.email})` : t("nav_user_aria", { name: "" })}
          aria-label={t("nav_user_aria", { name: user?.name ?? "" })}
        >
          {initialsFromUser(user?.name, user?.email)}
        </div>
        {expanded && (
          <div className="rail-user-info">
            <div className="rail-user-name">{user?.name || user?.email?.split("@")[0] || "Usuário"}</div>
            <div className="rail-user-email">{user?.email}</div>
          </div>
        )}
      </div>

      <LanguageSwitcher expanded={expanded} />

      <button
        type="button"
        className="rail-link rail-logout"
        onClick={async () => {
          const ok = await confirm({
            title: t("nav_logout_confirm.title"),
            message: t("nav_logout_confirm.message"),
            confirmLabel: t("nav_logout_confirm.confirmLabel"),
          });
          if (ok) logout();
        }}
        aria-label={t("nav.logout")}
      >
        <span className="rail-icon"><IconLogout size={18} /></span>
        {expanded
          ? <span className="rail-label">{t("nav.logout")}</span>
          : <span className="tip">{t("nav.logout")}</span>
        }
      </button>
    </aside>
  );
}
