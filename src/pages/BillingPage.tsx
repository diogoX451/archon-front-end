import { useEffect, useState } from "react";
import { useToast } from "@shared/ui/feedback";
import { getMeBilling, type MeBillingResponse } from "@shared/api/billing";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

function UsageBar({ label, value, limit, unit }: { label: string; value: number; limit: number; unit: string }) {
  const unlimited = limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, (value / limit) * 100);
  const critical = pct >= 90;
  const warning = pct >= 70 && !critical;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.875rem" }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: critical ? "var(--color-danger, #e53e3e)" : "var(--color-muted, #666)" }}>
          {unlimited ? `${value.toLocaleString()} ${unit}` : `${value.toLocaleString()} / ${limit.toLocaleString()} ${unit}`}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 8, borderRadius: 4, background: "var(--color-border, #e2e8f0)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 4,
              background: critical
                ? "var(--color-danger, #e53e3e)"
                : warning
                ? "var(--color-warning, #ed8936)"
                : "var(--color-primary, #3182ce)",
              transition: "width 400ms ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureTag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.6rem",
        borderRadius: 999,
        fontSize: "0.8rem",
        fontWeight: 500,
        background: enabled ? "var(--color-success-bg, #e6fffa)" : "var(--color-border, #e2e8f0)",
        color: enabled ? "var(--color-success, #2f855a)" : "var(--color-muted, #888)",
        border: `1px solid ${enabled ? "var(--color-success-border, #9ae6b4)" : "var(--color-border, #e2e8f0)"}`,
        marginRight: "0.5rem",
        marginBottom: "0.5rem",
      }}
    >
      {enabled ? "✓" : "—"} {label}
    </span>
  );
}

export function BillingPage() {
  const toast = useToast();
  const [data, setData] = useState<MeBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMeBilling()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err?.message || "Falha ao carregar plano"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-muted, #666)" }}>Carregando...</div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-danger, #e53e3e)" }}>
        Não foi possível carregar os dados do plano.
      </div>
    );
  }

  const { usage } = data;
  const planLabel = PLAN_LABELS[usage.plan] ?? usage.plan;
  const monthLabel = usage.month
    ? new Date(usage.month + "T00:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "";
  const expiresLabel = usage.plan_expires_at
    ? new Date(usage.plan_expires_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>Plano e Consumo</h1>
      <p style={{ color: "var(--color-muted, #666)", marginBottom: "2rem", fontSize: "0.9rem" }}>
        {data.name} ({data.slug}) — referência: {monthLabel}
      </p>

      {/* Plan badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          padding: "1rem 1.25rem",
          borderRadius: 8,
          border: "1px solid var(--color-border, #e2e8f0)",
          background: "var(--color-surface, #fff)",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-muted, #888)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plano atual</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{planLabel}</div>
          {expiresLabel && (
            <div style={{ fontSize: "0.8rem", color: "var(--color-muted, #888)", marginTop: "0.15rem" }}>
              Expira em {expiresLabel}
            </div>
          )}
        </div>
      </div>

      {/* Usage bars */}
      <div
        style={{
          padding: "1.25rem",
          borderRadius: 8,
          border: "1px solid var(--color-border, #e2e8f0)",
          background: "var(--color-surface, #fff)",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Uso do mês</h2>
        <UsageBar label="Execuções de agentes" value={usage.executions} limit={usage.executions_limit} unit="exec" />
        <UsageBar label="Tokens LLM" value={usage.llm_tokens} limit={usage.llm_tokens_limit} unit="tokens" />
        <UsageBar label="RAG (bytes)" value={usage.rag_bytes} limit={usage.rag_bytes_limit} unit="bytes" />
      </div>

      {/* Features */}
      <div
        style={{
          padding: "1.25rem",
          borderRadius: 8,
          border: "1px solid var(--color-border, #e2e8f0)",
          background: "var(--color-surface, #fff)",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Funcionalidades do plano</h2>
        <div>
          <FeatureTag label="Memória de Grafo" enabled={usage.graph_memory} />
          <FeatureTag label="CRM" enabled={usage.crm_enabled} />
          <FeatureTag label="Cartões Digitais" enabled={usage.cards_enabled} />
        </div>
      </div>
    </div>
  );
}
