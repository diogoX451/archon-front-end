import { useQuery } from "@tanstack/react-query";
import { getUsageSummary, getUsageTimeseries, getUsageBreakdown } from "@shared/api/observability";
import { DynamicBreadcrumbs } from "@shared/ui/DynamicBreadcrumbs";

function fmtCost(v: number) { return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`; }
function fmtNum(n: number) { return n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n); }
function fmtDate(iso: string) { try { return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); } catch { return iso; } }

export function ROIAnalyticsPage() {
  const summary = useQuery({ queryKey: ["roi","summary"], queryFn: () => getUsageSummary(), staleTime: 60_000 });
  const timeseries = useQuery({ queryKey: ["roi","timeseries"], queryFn: () => getUsageTimeseries({ bucket: "day" }), staleTime: 60_000 });
  const breakdown = useQuery({ queryKey: ["roi","breakdown"], queryFn: () => getUsageBreakdown({ dimension: "purpose" }), staleTime: 60_000 });

  const d = summary.data;
  const costPerCall = d && d.calls > 0 ? d.cost_usd / d.calls : 0;
  const ts = timeseries.data ?? [];
  const maxCalls = Math.max(...ts.map(r => r.calls), 1);

  return (
    <>
      <div className="page-topbar"><DynamicBreadcrumbs /></div>
      <div className="page-body">
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>ROI Analytics</h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 24px" }}>Consumo, custo e retorno por período</p>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total chamadas", value: d ? fmtNum(d.calls) : "—", sub: "no período" },
            { label: "Custo total", value: d ? fmtCost(d.cost_usd) : "—", sub: "USD estimado" },
            { label: "Custo / chamada", value: d && d.calls > 0 ? `$${costPerCall.toFixed(4)}` : "—", sub: "média" },
          ].map(c => (
            <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-4)", padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, margin: "4px 0" }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-4)", padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--ink-2)" }}>Chamadas por dia (últimos 30 dias)</div>
          {ts.length === 0 ? (
            <div style={{ opacity: 0.4, fontSize: 13 }}>Sem dados de série temporal.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                {ts.slice(-30).map((row, i) => {
                  const pct = row.calls / maxCalls;
                  return <div key={i} title={`${fmtDate(row.bucket_ts)}: ${row.calls} chamadas`} style={{ flex: 1, minWidth: 4, height: `${Math.max(pct*100,4)}%`, background: pct > 0.8 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 50%, transparent)", borderRadius: "2px 2px 0 0" }} />;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
                <span>{fmtDate(ts[0]?.bucket_ts ?? "")}</span>
                <span>{fmtDate(ts[ts.length-1]?.bucket_ts ?? "")}</span>
              </div>
            </>
          )}
        </div>

        {/* Breakdown table */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-4)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 600 }}>Breakdown por finalidade</div>
          {(breakdown.data?.length ?? 0) === 0 ? (
            <div style={{ padding: 16, opacity: 0.4, fontSize: 13 }}>Sem dados de breakdown.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {["Finalidade","Chamadas","Custo (USD)","% custo"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12, color: "var(--ink-2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(breakdown.data ?? []).map(r => (
                  <tr key={r.dimension} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 500 }}>{r.dimension || "—"}</td>
                    <td style={{ padding: "9px 12px" }}>{fmtNum(r.calls)}</td>
                    <td style={{ padding: "9px 12px" }}>{fmtCost(r.cost_usd)}</td>
                    <td style={{ padding: "9px 12px" }}>{Math.round((r.cost_pct ?? 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
