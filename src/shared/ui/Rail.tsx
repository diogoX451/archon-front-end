import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@app/auth-context";
import { useConfirm } from "@shared/ui/feedback";
import { canAny } from "@shared/authz";
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

// MCP icon: three nodes connected to a hub (mirrors the "external tool plug-in" idea).
export const IconMCPConfig = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="12" cy="20" r="2" />
    <path d="M7 7l3 3M17 7l-3 3M12 15v3" />
  </svg>
);

// Audit icon (clock with list)
export const IconAudit = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M8 14h2M8 18h5" />
  </svg>
);

// Privacy icon (shield + user) — link to /account/privacy.
export const IconPrivacy = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <circle cx="12" cy="11" r="2" />
    <path d="M9.5 16c.5-1.5 1.5-2 2.5-2s2 .5 2.5 2" />
  </svg>
);

// Logout icon (arrow-out-of-box)
export const IconLogout = (p: IconProps) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

type RailLink = {
  to: string;
  labelKey: string;
  icon: (p: IconProps) => JSX.Element;
  exact?: boolean;
  superOnly?: boolean;
  perms?: string[];
  tourTarget?: string;
};

const links: RailLink[] = [
  { to: "/dashboard", labelKey: "nav.overview", icon: IconOverview },
  { to: "/conversation", labelKey: "nav.conversation", icon: IconConversation },
  { to: "/workflows", labelKey: "nav.workflows", icon: IconWorkflows, perms: ["workflow_list"], tourTarget: "nav-workflows" },
  { to: "/templates", labelKey: "nav.agents", icon: IconAgents, perms: ["conversation_profile_list"], tourTarget: "nav-agents" },
  { to: "/events", labelKey: "nav.executions", icon: IconExecutions, perms: ["workflow_list"], tourTarget: "nav-events" },
  { to: "/rag", labelKey: "nav.rag", icon: IconRAG, perms: ["rag_read", "rag_query", "rag_ingest"], tourTarget: "nav-rag" },
  { to: "/profiles", labelKey: "nav.users", icon: IconProfiles, perms: ["user_list"] },
  { to: "/roles", labelKey: "nav.roles", icon: IconRoles, perms: ["role_list"] },
  { to: "/permissions", labelKey: "nav.permissions", icon: IconPermissions, superOnly: true, perms: ["permission_list"] },
  { to: "/tenants", labelKey: "nav.tenants", icon: IconTenants, superOnly: true },
  { to: "/channels", labelKey: "nav.channels", icon: IconChannels, perms: ["channel_manage"] },
  { to: "/llm-config", labelKey: "nav.llmConfig", icon: IconLLMConfig, perms: ["channel_manage"] },
  { to: "/mcp-config", labelKey: "nav.mcpServers", icon: IconMCPConfig, perms: ["channel_manage"] },
  { to: "/admin-audit", labelKey: "nav.auditLog", icon: IconAudit, superOnly: true },
  // Visible to every authenticated user — LGPD Art. 18 self-service.
  { to: "/account/privacy", labelKey: "nav.myPrivacy", icon: IconPrivacy },
];

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

  const isActive = (link: RailLink) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname === link.to || location.pathname.startsWith(link.to + "/");
  };

  const visibleLinks = links.filter((link) => {
    if (link.superOnly && !isSuper) return false;
    if (!link.perms || link.perms.length === 0) return true;
    return canAny({ isSuper, hasPermission }, link.perms);
  });

  return (
    <aside className="rail">
      <div className="rail-brand" aria-hidden="true"></div>
      <nav className="rail-nav">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="rail-link"
            data-active={isActive(link) ? "true" : undefined}
            data-tour={link.tourTarget}
          >
            <link.icon size={18} />
            <span className="tip">{t(link.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="rail-spacer"></div>
      <div
        className="rail-avatar"
        title={user ? `${user.name} (${user.email})` : t("nav_user_aria", { name: "" })}
        aria-label={t("nav_user_aria", { name: user?.name ?? "" })}
      >
        {initialsFromUser(user?.name, user?.email)}
      </div>
      <button
        type="button"
        className="rail-link"
        onClick={async () => {
          const ok = await confirm({
            title: t("nav_logout_confirm.title"),
            message: t("nav_logout_confirm.message"),
            confirmLabel: t("nav_logout_confirm.confirmLabel"),
          });
          if (ok) logout();
        }}
        aria-label={t("nav.logout")}
        style={{ background: "transparent", border: "none", marginTop: 8, cursor: "pointer" }}
      >
        <IconLogout size={18} />
        <span className="tip">{t("nav.logout")}</span>
      </button>
    </aside>
  );
}
