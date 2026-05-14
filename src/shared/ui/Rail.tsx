import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { useConfirm } from "@shared/ui/feedback";
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
  label: string;
  icon: (p: IconProps) => JSX.Element;
  exact?: boolean;
  superOnly?: boolean;
};

const links: RailLink[] = [
  { to: "/", label: "Overview", icon: IconOverview, exact: true },
  { to: "/conversation", label: "Conversation", icon: IconConversation },
  { to: "/workflows", label: "Workflows", icon: IconWorkflows },
  { to: "/templates", label: "Agentes", icon: IconAgents },
  { to: "/events", label: "Execuções", icon: IconExecutions },
  { to: "/rag", label: "Bases RAG", icon: IconRAG },
  { to: "/profiles", label: "Usuários", icon: IconProfiles },
  { to: "/roles", label: "Papéis", icon: IconRoles },
  { to: "/permissions", label: "Permissões", icon: IconPermissions, superOnly: true },
  { to: "/tenants", label: "Tenants", icon: IconTenants, superOnly: true },
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
  const { user, isSuper, logout } = useAuth();
  const confirm = useConfirm();

  const isActive = (link: RailLink) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname === link.to || location.pathname.startsWith(link.to + "/");
  };

  const visibleLinks = links.filter((link) => !link.superOnly || isSuper);

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
          >
            <link.icon size={18} />
            <span className="tip">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="rail-spacer"></div>
      <div
        className="rail-avatar"
        title={user ? `${user.name} (${user.email})` : "Usuário"}
        aria-label={user ? `Usuário ${user.name}` : "Usuário"}
      >
        {initialsFromUser(user?.name, user?.email)}
      </div>
      <button
        type="button"
        className="rail-link"
        onClick={async () => {
          const ok = await confirm({
            title: "Sair da conta",
            message: "Você precisará fazer login novamente para acessar o app.",
            confirmLabel: "Sair",
          });
          if (ok) logout();
        }}
        aria-label="Sair"
        style={{ background: "transparent", border: "none", marginTop: 8, cursor: "pointer" }}
      >
        <IconLogout size={18} />
        <span className="tip">Sair</span>
      </button>
    </aside>
  );
}
