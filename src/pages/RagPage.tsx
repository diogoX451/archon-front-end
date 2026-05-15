import { useEffect, useMemo, useState } from "react";
import { IconPlus, IconRAG, IconTrash } from "@shared/ui/icons/Icons";
import {
  useCreateRAGIngestUploadWorkflow,
  useRAGCoverage,
  useRAGDashboard,
  useRAGDocuments,
} from "@shared/hooks/useRag";
import { useCreateKB, useDeleteKB, useKBs } from "@shared/hooks/useKBs";
import { useTenants } from "@shared/hooks/useTenants";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";
import { useConfirm, useToast } from "@shared/ui/feedback";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";

// Upload validation (LGPD: minimização — só aceitar formatos esperados e
// recusar arquivos absurdamente grandes antes de transitarem). O backend
// ainda valida por extensão e content-type, isso aqui é apenas o
// primeiro portão para o usuário.
const ALLOWED_RAG_EXTENSIONS = new Set([
  "pdf", "docx", "txt", "md", "csv", "json", "xml", "yaml", "yml", "html",
]);
const MAX_RAG_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

function isAllowedRAGFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_RAG_EXTENSIONS.has(ext);
}

function slugifyKBID(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function fmtBytes(value?: number): string {
  if (!value || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status?: string): "ok" | "warn" | "err" {
  if (status === "indexed") return "ok";
  if (status === "failed") return "err";
  return "warn";
}

export function RagPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { isSuper, activeTenantSlug, hasPermission } = useAuth();
  const canRead = canAny({ isSuper, hasPermission }, ["rag_read"]);
  const canIngest = canAny({ isSuper, hasPermission }, ["rag_ingest"]);
  const { data: tenants } = useTenants();
  // Tenant-admins are pinned to their tenant; super-admins can switch
  // via the selector below.
  const [tenantSlug, setTenantSlug] = useState(isSuper ? "" : activeTenantSlug || "");
  const effectiveTenantSlug = tenantSlug.trim();

  const [showCreateKBModal, setShowCreateKBModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [selectedKBID, setSelectedKBID] = useState("");

  const [newKBName, setNewKBName] = useState("");
  const [newKBID, setNewKBID] = useState("");
  const [newKBDescription, setNewKBDescription] = useState("");
  const [newKBScope, setNewKBScope] = useState("tenant");

  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [documentID, setDocumentID] = useState("");

  const [pollingDocs, setPollingDocs] = useState(false);

  const dashboardQuery = useRAGDashboard(effectiveTenantSlug || undefined);
  const kbsQuery = useKBs(effectiveTenantSlug, { limit: 50, offset: 0 });
  const createKB = useCreateKB(effectiveTenantSlug);
  const deleteKB = useDeleteKB(effectiveTenantSlug);
  const ingestUploadMutation = useCreateRAGIngestUploadWorkflow();

  const docsQuery = useRAGDocuments(effectiveTenantSlug || undefined, selectedKBID || undefined, {
    enabled: !!effectiveTenantSlug && !!selectedKBID,
    refetchInterval: pollingDocs ? 4000 : false,
  });
  const coverageQuery = useRAGCoverage(effectiveTenantSlug || undefined, selectedKBID || undefined);

  const kbs = kbsQuery.data || [];
  const docs = docsQuery.data?.items || [];
  const coverage = coverageQuery.data;

  useEffect(() => {
    if (!selectedKBID && kbs.length > 0) {
      setSelectedKBID(kbs[0].kb_id);
    }
  }, [kbs, selectedKBID]);

  useEffect(() => {
    const hasPending = docs.some((d) => d.status === "pending");
    if (pollingDocs && !hasPending) {
      setPollingDocs(false);
    }
  }, [docs, pollingDocs]);

  useEffect(() => {
    const suggested = slugifyKBID(newKBName);
    if (suggested && (!newKBID || newKBID === slugifyKBID(newKBName))) {
      setNewKBID(suggested);
    }
  }, [newKBName]);

  const onCreateKB = async () => {
    if (!effectiveTenantSlug || !newKBName.trim() || !newKBID.trim()) return;
    try {
      await createKB.mutateAsync({
        name: newKBName.trim(),
        kb_id: newKBID.trim(),
        description: newKBDescription.trim() || undefined,
        access_scope: newKBScope || "tenant",
      });
      setShowCreateKBModal(false);
      setNewKBName("");
      setNewKBID("");
      setNewKBDescription("");
      setNewKBScope("tenant");
      toast.success("Base RAG criada.");
    } catch (err: any) {
      toast.error(`Erro ao criar base: ${err?.message || err}`);
    }
  };

  const onDeleteKB = async (kbID: string) => {
    const ok = await confirm({
      title: "Excluir base RAG",
      message: `Tem certeza que quer excluir a base "${kbID}"? Todos os documentos ingeridos serão removidos.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteKB.mutateAsync(kbID);
      if (selectedKBID === kbID) setSelectedKBID("");
      toast.success("Base excluída.");
    } catch (err: any) {
      toast.error(`Erro ao excluir base: ${err?.message || err}`);
    }
  };

  const onPickFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!isAllowedRAGFile(next)) {
      toast.error(
        "Tipo de arquivo não permitido. Aceito: PDF, DOCX, TXT, MD, CSV, JSON, XML, YAML/YML, HTML."
      );
      return;
    }
    if (next.size > MAX_RAG_UPLOAD_BYTES) {
      const mb = Math.round((MAX_RAG_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10;
      toast.error(`Arquivo excede o tamanho máximo de ${mb} MB.`);
      return;
    }
    setFile(next);
    const title = next.name.replace(/\.[^.]+$/, "");
    setDocTitle(title);
    setDocumentID(globalThis.crypto?.randomUUID?.() || `${Date.now()}`);
  };

  const onIngest = async () => {
    if (!effectiveTenantSlug || !selectedKBID || !file) return;
    const fd = new FormData();
    fd.append("tenant_id", effectiveTenantSlug);
    fd.append("knowledge_base_id", selectedKBID);
    fd.append("document_id", documentID || (globalThis.crypto?.randomUUID?.() || `${Date.now()}`));
    fd.append("metadata", JSON.stringify({ title: docTitle || file.name.replace(/\.[^.]+$/, "") }));
    fd.append("file", file);

    try {
      await ingestUploadMutation.mutateAsync(fd);
      setShowIngestModal(false);
      setFile(null);
      setDocTitle("");
      setDocumentID("");
      setPollingDocs(true);
      docsQuery.refetch();
      toast.success("Upload iniciado. Aguardando processamento.");
    } catch (err: any) {
      toast.error(`Erro no upload: ${err?.message || err}`);
    }
  };

  const coveragePct = Math.max(0, Math.min(100, Math.round((coverage?.coverage_score || 0) * 100)));

  return (
    <>
      <div className="page-topbar">
        <DynamicBreadcrumbs />
        <div style={{ flex: 1 }}></div>
        <button className="btn primary" onClick={() => setShowCreateKBModal(true)} disabled={!effectiveTenantSlug || !canIngest}>
          <IconPlus size={14} /> Nova Base de Conhecimento
        </button>
      </div>

      <div className="page-body">
        {!canRead && (
          <div className="card" style={{ borderColor: "var(--err)", color: "var(--err)", marginBottom: 12 }}>
            Você não tem permissão para visualizar dados de RAG.
          </div>
        )}
        {isSuper && (
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <select className="field-select" style={{ width: 320 }} value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)}>
              <option value="">Selecione um tenant</option>
              {(tenants || []).map((t) => (
                <option key={t.id} value={t.slug}>{t.slug} ({t.name})</option>
              ))}
            </select>
            <input className="search-input" style={{ width: 260 }} placeholder="ou digite tenant_slug" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
          </div>
        )}

        <div className="stat-grid">
          <div className="stat"><div className="label">Knowledge Bases</div><div className="value">{effectiveTenantSlug ? (dashboardQuery.data?.knowledge_bases_total ?? "…") : "—"}</div></div>
          <div className="stat"><div className="label">Documentos</div><div className="value">{effectiveTenantSlug ? (dashboardQuery.data?.documents_total ?? "…") : "—"}</div></div>
          <div className="stat"><div className="label">Chunks</div><div className="value">{effectiveTenantSlug ? (dashboardQuery.data?.chunks_total ?? "…") : "—"}</div></div>
          <div className="stat"><div className="label">Queries 24h</div><div className="value">{effectiveTenantSlug ? (dashboardQuery.data?.queries_24h ?? "…") : "—"}</div></div>
          <div className="stat"><div className="label">Ingests 24h</div><div className="value">{effectiveTenantSlug ? (dashboardQuery.data?.ingests_24h ?? "…") : "—"}</div></div>
        </div>

        {dashboardQuery.error && <div className="card" style={{ color: "var(--err)", borderColor: "var(--err)", marginBottom: 12 }}>Dashboard API: {(dashboardQuery.error as Error).message}</div>}
        {kbsQuery.error && <div className="card" style={{ color: "var(--err)", borderColor: "var(--err)", marginBottom: 12 }}>KBs API: {(kbsQuery.error as Error).message}</div>}

        <div className="section-head" style={{ marginTop: 18 }}><h2>Bases de Conhecimento</h2></div>
        <div className="card-grid">
          {kbs.map((kb) => (
            <div key={kb.id} className="card">
              <div className="card-header">
                <div className="card-glyph"><IconRAG size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title">{kb.name}</div>
                  <div className="card-sub">{kb.kb_id}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", minHeight: 32 }}>{kb.description || "Sem descrição"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => setSelectedKBID(kb.kb_id)}>
                  {selectedKBID === kb.kb_id ? "Base aberta" : "Abrir documentos da base"}
                </button>
                <button className="btn ghost" onClick={() => onDeleteKB(kb.kb_id)} disabled={deleteKB.isPending || !canIngest}><IconTrash size={14} /> Excluir</button>
              </div>
            </div>
          ))}
        </div>

        {!!selectedKBID && (
          <>
            <div className="section-head" style={{ marginTop: 28 }}>
              <h2>Documentos da KB: <span className="mono">{selectedKBID}</span></h2>
              <div style={{ flex: 1 }}></div>
              <button className="btn primary" onClick={() => setShowIngestModal(true)} disabled={!canIngest}>Adicionar Documento</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                <span>Cobertura Semântica</span>
                <span className="mono">{coveragePct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--line)", overflow: "hidden" }}>
                <div style={{ width: `${coveragePct}%`, height: "100%", background: "oklch(0.62 0.16 160)" }}></div>
              </div>
            </div>

            {docsQuery.error && <div className="card" style={{ color: "var(--err)", borderColor: "var(--err)", marginBottom: 12 }}>Documents API: {(docsQuery.error as Error).message}</div>}
            {coverageQuery.error && <div className="card" style={{ color: "var(--err)", borderColor: "var(--err)", marginBottom: 12 }}>Coverage API: {(coverageQuery.error as Error).message}</div>}

            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th className="num">Chunks</th>
                  <th className="num">Tamanho</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.title || d.id}</td>
                    <td>
                      <span className="pill" data-tone={statusTone(d.status)}>
                        <span className="dot"></span>{d.status || "pending"}
                      </span>
                    </td>
                    <td className="num mono">{d.chunks_count ?? "—"}</td>
                    <td className="num mono">{fmtBytes(d.size_bytes)}</td>
                    <td className="muted">{new Date(d.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {showCreateKBModal && canIngest && (
        <div style={overlayStyle} onClick={() => setShowCreateKBModal(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Nova Base de Conhecimento</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="search-input" placeholder="Nome da base *" value={newKBName} onChange={(e) => setNewKBName(e.target.value)} />
              <input className="search-input" placeholder="Identificador (kb_id) *" value={newKBID} onChange={(e) => setNewKBID(e.target.value)} />
              <textarea className="search-input" placeholder="Descrição" value={newKBDescription} onChange={(e) => setNewKBDescription(e.target.value)} style={{ minHeight: 72, resize: "vertical" }} />
              <select className="field-select" value={newKBScope} onChange={(e) => setNewKBScope(e.target.value)}>
                <option value="tenant">tenant</option>
                <option value="private">private</option>
                <option value="public">public</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowCreateKBModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={onCreateKB} disabled={createKB.isPending || !newKBName.trim() || !newKBID.trim()}>
                {createKB.isPending ? "Criando..." : "Criar Base"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIngestModal && canIngest && (
        <div style={overlayStyle} onClick={() => setShowIngestModal(false)}>
          <div className="card" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Adicionar Documento</div>
            <div
              role="note"
              style={{
                fontSize: 12,
                color: "var(--ink-3)",
                background: "color-mix(in oklab, var(--ink) 4%, transparent)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 10px",
                marginBottom: 10,
                lineHeight: 1.45,
              }}
            >
              Ao enviar você confirma ter base legal para tratar o conteúdo. Não envie dados
              pessoais sensíveis (Art. 5º, II da LGPD) sem consentimento específico do
              titular. Formatos aceitos: PDF, DOCX, TXT, MD, CSV, JSON, XML, YAML, HTML —
              tamanho máximo 25 MB.
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
              <input className="search-input" placeholder="Título" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              <input className="search-input" placeholder="document_id" value={documentID} onChange={(e) => setDocumentID(e.target.value)} />
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                KB: <code>{selectedKBID}</code> · tenant: <code>{effectiveTenantSlug}</code>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button className="btn" onClick={() => setShowIngestModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={onIngest} disabled={ingestUploadMutation.isPending || !file || !selectedKBID || !effectiveTenantSlug}>
                {ingestUploadMutation.isPending ? "Enviando..." : "Ingerir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgb(10 12 16 / 0.55)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  padding: 18,
};
