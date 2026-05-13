import { useMemo } from "react";
import { useLocation } from "react-router-dom";

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

function buildCrumbs(pathname: string, search: string): string[] {
  const q = new URLSearchParams(search);
  if (pathname === "/") return ["Overview", "Painel geral"];
  if (pathname.startsWith("/conversation")) {
    const out = ["Conversation"];
    const conv = q.get("conv");
    if (conv) out.push(`conv ${shortId(conv)}`);
    return out;
  }
  if (pathname === "/workflows") return ["Workflows", "Lista"];
  if (pathname.startsWith("/workflows/result")) {
    const out = ["Workflows", "Resultado"];
    const id = q.get("id");
    if (id) out.push(`id ${shortId(id)}`);
    return out;
  }
  if (pathname.startsWith("/workflows/builder")) {
    const out = ["Workflows", "Builder"];
    const parts = pathname.split("/").filter(Boolean);
    const maybeId = parts[2];
    if (maybeId) out.push(maybeId === "new" ? "novo" : shortId(maybeId));
    return out;
  }
  if (pathname.startsWith("/templates")) return ["Agentes", "Templates"];
  if (pathname.startsWith("/events")) return ["Execuções", "Observabilidade"];
  if (pathname.startsWith("/rag")) return ["RAG", "Bases"];
  if (pathname.startsWith("/profiles")) return ["Usuários", "Gestão"];
  if (pathname.startsWith("/tenants")) return ["Tenants", "Organizações"];
  const segments = pathname.split("/").filter(Boolean);
  return segments.map(titleize);
}

export function DynamicBreadcrumbs({ mode = "page", includeWorkspace = false }: DynamicBreadcrumbsProps) {
  const location = useLocation();
  const crumbs = useMemo(() => {
    const base = buildCrumbs(location.pathname, location.search);
    return includeWorkspace ? ["Workspace", ...base] : base;
  }, [location.pathname, location.search, includeWorkspace]);

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
