import { useEffect } from "react";

type Meta = {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
};

// Atualiza <title>, meta description e canonical no head ao montar a página.
// Quando o componente desmontar, restaura o estado original — útil porque o
// app é SPA e o head é compartilhado entre as rotas.
export function useDocumentMeta({ title, description, canonical, robots }: Meta) {
  useEffect(() => {
    const prevTitle = document.title;
    const descTag = ensureMeta("name", "description");
    const robotsTag = ensureMeta("name", "robots");
    const canonicalTag = ensureLink("canonical");
    const ogTitle = ensureMeta("property", "og:title");
    const ogDesc = ensureMeta("property", "og:description");
    const ogUrl = ensureMeta("property", "og:url");
    const twTitle = ensureMeta("name", "twitter:title");
    const twDesc = ensureMeta("name", "twitter:description");

    const prev = {
      desc: descTag.getAttribute("content"),
      robots: robotsTag.getAttribute("content"),
      canonical: canonicalTag.getAttribute("href"),
      ogTitle: ogTitle.getAttribute("content"),
      ogDesc: ogDesc.getAttribute("content"),
      ogUrl: ogUrl.getAttribute("content"),
      twTitle: twTitle.getAttribute("content"),
      twDesc: twDesc.getAttribute("content"),
    };

    document.title = title;
    ogTitle.setAttribute("content", title);
    twTitle.setAttribute("content", title);

    if (description) {
      descTag.setAttribute("content", description);
      ogDesc.setAttribute("content", description);
      twDesc.setAttribute("content", description);
    }
    if (canonical) {
      canonicalTag.setAttribute("href", canonical);
      ogUrl.setAttribute("content", canonical);
    }
    if (robots) robotsTag.setAttribute("content", robots);

    return () => {
      document.title = prevTitle;
      if (prev.desc) descTag.setAttribute("content", prev.desc);
      if (prev.robots) robotsTag.setAttribute("content", prev.robots);
      if (prev.canonical) canonicalTag.setAttribute("href", prev.canonical);
      if (prev.ogTitle) ogTitle.setAttribute("content", prev.ogTitle);
      if (prev.ogDesc) ogDesc.setAttribute("content", prev.ogDesc);
      if (prev.ogUrl) ogUrl.setAttribute("content", prev.ogUrl);
      if (prev.twTitle) twTitle.setAttribute("content", prev.twTitle);
      if (prev.twDesc) twDesc.setAttribute("content", prev.twDesc);
    };
  }, [title, description, canonical, robots]);
}

function ensureMeta(attr: "name" | "property", key: string): HTMLMetaElement {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureLink(rel: string): HTMLLinkElement {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  return tag;
}
