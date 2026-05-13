import React, { useState, useMemo } from "react";
import { AGENT_TYPES, CATEGORIES } from "./data";
import { IconSearch, GLYPHS, GlyphPlanner } from "@shared/ui/icons/Icons";

type PaletteProps = {
  onStartDrag: (type: string, e: React.MouseEvent) => void;
};

export function Palette({ onStartDrag }: PaletteProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const byCat: Record<string, typeof AGENT_TYPES[string][]> = {};
    for (const cat of CATEGORIES) byCat[cat] = [];
    
    for (const [type, meta] of Object.entries(AGENT_TYPES)) {
      if (query) {
        const q = query.toLowerCase();
        if (
          !meta.label.toLowerCase().includes(q) &&
          !type.includes(q) &&
          !meta.description.toLowerCase().includes(q)
        ) {
          continue;
        }
      }
      byCat[meta.category]?.push({ ...meta, type } as any);
    }
    return byCat;
  }, [query]);

  return (
    <div className="palette">
      <div className="panel-header">
        <span>Paleta de Agentes</span>
        <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
          {Object.values(AGENT_TYPES).filter((m) => CATEGORIES.includes(m.category)).length}
        </span>
      </div>
      <div style={{ position: "relative", margin: "0 12px 8px" }}>
        <IconSearch className="icon-sm" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
        <input
          className="palette-search"
          placeholder="Buscar agentes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 26, width: "100%", margin: 0 }}
        />
      </div>
      {CATEGORIES.map((cat) => groups[cat].length > 0 && (
        <div key={cat}>
          <div className="palette-category">{cat}</div>
          {groups[cat].map((item: any) => {
            const Glyph = (GLYPHS as any)[item.glyph] || GlyphPlanner;
            return (
              <div
                key={item.type}
                className="palette-item"
                onMouseDown={(e) => { e.preventDefault(); onStartDrag(item.type, e); }}
              >
                <div className="glyph"><Glyph size={14} /></div>
                <div className="meta">
                  <div className="name">{item.label}</div>
                  <div className="desc">{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="palette-foot">
        <strong style={{ color: "var(--ink-2)", fontWeight: 500 }}>Dica:</strong>{" "}
        arraste um item ao canvas. Conecte portas auxiliares (à direita) a portas principais (à esquerda) para definir o fluxo.
      </div>
    </div>
  );
}
