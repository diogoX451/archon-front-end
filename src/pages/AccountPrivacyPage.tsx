import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@app/auth-context";
import { useToast, useConfirm } from "@shared/ui/feedback";
import {
  cancelAccountDeletion,
  downloadMyExport,
  getMyActivity,
  getMyData,
  requestAccountDeletion,
  type ActivityEntry,
  type MeData,
} from "@shared/api/me";

// AccountPrivacyPage centralises the LGPD data-subject rights (Art. 18)
// for the authenticated user: confirmation, access, portability,
// deletion request, restore, and personal activity log.
export function AccountPrivacyPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [data, setData] = useState<MeData | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getMyData(), getMyActivity(50)])
      .then(([d, a]) => {
        if (cancelled) return;
        setData(d);
        setActivity(a);
      })
      .catch((err) => {
        toast.error(err?.message || "Falha ao carregar seus dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadMyExport();
      toast.success("Exportação concluída. O download deve iniciar automaticamente.");
    } catch (err) {
      toast.error((err as Error).message || "Falha na exportação");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Excluir minha conta",
      message:
        "Sua conta será desativada agora e removida em definitivo após 30 dias. Você poderá cancelar a exclusão dentro deste prazo fazendo login novamente. Confirma?",
      confirmLabel: "Excluir conta",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await requestAccountDeletion();
      toast.warning(res.message, { title: "Conta agendada para exclusão" });
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error((err as Error).message || "Falha ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await cancelAccountDeletion();
      toast.success("Exclusão cancelada. Sua conta segue ativa.");
      const fresh = await getMyData();
      setData(fresh);
    } catch (err) {
      toast.error((err as Error).message || "Falha ao cancelar exclusão");
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "var(--ink-3)" }}>Carregando seus dados…</div>;
  }
  if (!data) {
    return <div style={{ padding: 24, color: "var(--err)" }}>Falha ao carregar.</div>;
  }

  const pendingDeletion = Boolean(data.user.purge_at);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Minha Privacidade</h1>
        <p style={{ color: "var(--ink-3)", margin: "6px 0 0", fontSize: 14 }}>
          Exerça seus direitos como titular de dados pessoais conforme o art. 18 da LGPD.
        </p>
      </header>

      {pendingDeletion && (
        <section style={warningBox}>
          <div>
            <strong>Conta agendada para exclusão.</strong> Eliminação prevista para{" "}
            <strong>{new Date(data.user.purge_at!).toLocaleString("pt-BR")}</strong>. Você
            pode cancelar a exclusão até essa data.
          </div>
          <button type="button" onClick={handleRestore} disabled={restoring} style={primaryButton}>
            {restoring ? "Cancelando…" : "Cancelar exclusão"}
          </button>
        </section>
      )}

      <section style={card}>
        <h2 style={cardTitle}>Seus dados</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0, fontSize: 14 }}>
          <dt style={dt}>Nome</dt>
          <dd style={dd}>{data.user.name}</dd>
          <dt style={dt}>E-mail</dt>
          <dd style={dd}>{data.user.email}</dd>
          <dt style={dt}>Conta criada em</dt>
          <dd style={dd}>{new Date(data.user.created_at).toLocaleString("pt-BR")}</dd>
          <dt style={dt}>Tenant</dt>
          <dd style={dd}>{data.tenant.name} <span style={{ color: "var(--ink-3)" }}>({data.tenant.slug})</span></dd>
          {data.tenant.document && (
            <>
              <dt style={dt}>Documento do tenant</dt>
              <dd style={dd}>{data.tenant.document}</dd>
            </>
          )}
        </dl>
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Portabilidade (Art. 18, V)</h2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-2)" }}>
          Baixe uma cópia legível em JSON contendo seus dados pessoais e o histórico de
          atividades administrativas vinculado à sua conta.
        </p>
        <button type="button" onClick={handleExport} disabled={exporting} style={primaryButton}>
          {exporting ? "Gerando…" : "Exportar meus dados"}
        </button>
      </section>

      <section style={card}>
        <h2 style={cardTitle}>Atividade recente</h2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-2)" }}>
          As últimas {activity.length} ações administrativas executadas com a sua conta.
        </p>
        {activity.length === 0 ? (
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>Nenhuma ação registrada.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--ink-3)", textAlign: "left" }}>
                  <th style={th}>Quando</th>
                  <th style={th}>Método</th>
                  <th style={th}>Rota</th>
                  <th style={th}>Status</th>
                  <th style={th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{new Date(row.occurred_at).toLocaleString("pt-BR")}</td>
                    <td style={td}>{row.method}</td>
                    <td style={td}>{row.route || row.path}</td>
                    <td style={td}>{row.status_code}</td>
                    <td style={td}>{row.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!pendingDeletion && !data.user.is_super && (
        <section style={{ ...card, borderColor: "color-mix(in oklab, var(--err) 30%, var(--line))" }}>
          <h2 style={{ ...cardTitle, color: "var(--err)" }}>Excluir minha conta (Art. 18, VI)</h2>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-2)" }}>
            Sua conta será desativada agora e removida em definitivo após 30 dias. Dentro
            desse prazo você pode reativá-la fazendo login.
          </p>
          <button type="button" onClick={handleDelete} disabled={deleting} style={dangerButton}>
            {deleting ? "Excluindo…" : "Excluir minha conta"}
          </button>
        </section>
      )}

      {data.user.is_super && (
        <section style={{ ...card, borderColor: "var(--line)" }}>
          <h2 style={cardTitle}>Conta de super-administrador</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-3)" }}>
            Super-administradores não podem se auto-excluir pelo painel. Para sair da
            plataforma, transfira o papel para outro administrador e contate o DPO em{" "}
            <a href="mailto:dpo@almexa.com.br" style={{ color: "var(--ink)" }}>dpo@almexa.com.br</a>.
          </p>
        </section>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "20px 22px",
};
const cardTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 16,
  fontWeight: 600,
};
const warningBox: React.CSSProperties = {
  background: "color-mix(in oklab, oklch(0.7 0.15 80) 12%, transparent)",
  border: "1px solid color-mix(in oklab, oklch(0.7 0.15 80) 35%, transparent)",
  borderRadius: 12,
  padding: "14px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  fontSize: 14,
};
const primaryButton: React.CSSProperties = {
  background: "var(--ink)",
  color: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
const dangerButton: React.CSSProperties = {
  ...primaryButton,
  background: "var(--err)",
  color: "white",
};
const dt: React.CSSProperties = { color: "var(--ink-3)" };
const dd: React.CSSProperties = { margin: 0 };
const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "8px", color: "var(--ink-2)" };
