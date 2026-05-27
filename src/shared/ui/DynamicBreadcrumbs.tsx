import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

type DynamicBreadcrumbsProps = {
  mode?: "page" | "inline";
  includeWorkspace?: boolean;
};

function shortId(v: string): string {
  const s = (v || "").trim();
  if (!s) return "";
  return s.length > 12 ? `${s.slice(0, 8)}…` : s;
}

function titleize(seg: string): string {
  return seg
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

type CrumbKey = { key: string; params?: Record<string, string> };

function buildCrumbKeys(pathname: string, search: string): CrumbKey[] {
  const q = new URLSearchParams(search);
  if (pathname === "/") return [{ key: "breadcrumbs.overview" }, { key: "breadcrumbs.dashboard" }];
  if (pathname.startsWith("/conversation")) {
    const out: CrumbKey[] = [{ key: "breadcrumbs.conversation" }];
    const conv = q.get("conv");
    if (conv) out.push({ key: "breadcrumbs.conv", params: { id: shortId(conv) } });
    return out;
  }
  if (pathname === "/workflows") return [{ key: "breadcrumbs.workflows" }, { key: "breadcrumbs.workflowList" }];
  if (pathname.startsWith("/workflows/result")) {
    const out: CrumbKey[] = [{ key: "breadcrumbs.workflows" }, { key: "breadcrumbs.workflowResult" }];
    const id = q.get("id");
    if (id) out.push({ key: "breadcrumbs.workflowResultId", params: { id: shortId(id) } });
    return out;
  }
  if (pathname.startsWith("/workflows/builder")) {
    const out: CrumbKey[] = [{ key: "breadcrumbs.workflows" }, { key: "breadcrumbs.workflowBuilder" }];
    const parts = pathname.split("/").filter(Boolean);
    const maybeId = parts[2];
    if (maybeId)
      out.push(
        maybeId === "new"
          ? { key: "breadcrumbs.workflowBuilderNew" }
          : { key: "breadcrumbs.workflowBuilderId", params: { id: shortId(maybeId) } }
      );
    return out;
  }
  if (pathname.startsWith("/templates")) return [{ key: "breadcrumbs.agents" }, { key: "breadcrumbs.agentTemplates" }];
  if (pathname.startsWith("/events")) return [{ key: "breadcrumbs.executions" }, { key: "breadcrumbs.observability" }];
  if (pathname.startsWith("/rag")) return [{ key: "breadcrumbs.rag" }, { key: "breadcrumbs.ragBases" }];
  if (pathname.startsWith("/profiles")) return [{ key: "breadcrumbs.users" }, { key: "breadcrumbs.usersManagement" }];
  if (pathname.startsWith("/tenants")) return [{ key: "breadcrumbs.tenants" }, { key: "breadcrumbs.tenantsOrgs" }];
  if (pathname.startsWith("/admin-audit")) return [{ key: "breadcrumbs.admin" }, { key: "breadcrumbs.adminAuditLog" }];
  if (pathname.startsWith("/llm-config")) return [{ key: "breadcrumbs.admin" }, { key: "breadcrumbs.llmConfig" }];
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg) => ({ key: `__raw__${titleize(seg)}` }));
}

export function DynamicBreadcrumbs({ mode = "page", includeWorkspace = false }: DynamicBreadcrumbsProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const crumbs = useMemo(() => {
    const keys = buildCrumbKeys(location.pathname, location.search);
    const base = keys.map(({ key, params }) =>
      key.startsWith("__raw__") ? key.slice(7) : t(key, params)
    );
    return includeWorkspace ? [t("breadcrumbs.workspace", "Workspace"), ...base] : base;
  }, [location, includeWorkspace, t]);

  const titleClass = mode === "page" ? "page-title" : undefined;
  const subClass = mode === "page" ? "page-sub" : undefined;
  const sepClass = mode === "inline" ? "sep" : subClass;

  return (
    <>
      {crumbs.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className={i === 0 ? titleClass : subClass}
          style={i > 0 && mode === "page" ? { color: "var(--ink-3)" } : undefined}
        >
          {i > 0 && <span className={sepClass} style={{ marginRight: 8, color: "var(--ink-4)" }}>/</span>}
          {c}
        </span>
      ))}
    </>
  );
}
