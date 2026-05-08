import { NavLink, useLocation } from "react-router-dom";
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

const links = [
  { to: "/", label: "Overview", icon: IconOverview, exact: true },
  { to: "/conversation", label: "Conversation", icon: IconConversation },
  { to: "/workflows", label: "Workflows", icon: IconWorkflows },
  { to: "/templates", label: "Agentes", icon: IconAgents },
  { to: "/events", label: "Execuções", icon: IconExecutions },
  { to: "/rag", label: "Bases RAG", icon: IconRAG },
  { to: "/profiles", label: "Usuários", icon: IconProfiles },
  { to: "/tenants", label: "Tenants", icon: IconTenants },
];

export function Rail() {
  const location = useLocation();

  const isActive = (link: typeof links[0]) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname === link.to || location.pathname.startsWith(link.to + "/");
  };

  return (
    <aside className="rail">
      <div className="rail-brand" aria-hidden="true"></div>
      <nav className="rail-nav">
        {links.map((link) => (
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
      <div className="rail-avatar">DX</div>
    </aside>
  );
}
