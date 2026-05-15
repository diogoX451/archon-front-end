// Pós-build: gera dist/<rota>/index.html para cada página pública,
// com title, description, canonical e OG/Twitter próprios.
// O <body> continua sendo renderizado por JS no cliente, mas isso é o
// suficiente para previews de link e indexação de meta tags.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DIST = "dist";
const SITE = "https://archon.almexa.com.br";

const ROUTES = [
  {
    slug: "privacy",
    title: "Política de Privacidade — Almexa · Archon",
    description:
      "Como a Almexa LTDA trata seus dados pessoais no produto Archon, em conformidade com a LGPD.",
    dropFaqSchema: true,
  },
  {
    slug: "terms",
    title: "Termos de Uso — Almexa · Archon",
    description:
      "Condições gerais para uso da plataforma Archon, fornecida pela Almexa LTDA.",
    dropFaqSchema: true,
  },
  {
    slug: "dpo",
    title: "Encarregado pelo Tratamento (DPO) — Almexa",
    description:
      "Canal direto com o encarregado pela proteção de dados da Almexa LTDA, em conformidade com a LGPD.",
    dropFaqSchema: true,
  },
];

const baseHtml = await readFile(path.join(DIST, "index.html"), "utf8");

function patch(html, { title, description, canonical, dropFaqSchema }) {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${canonical}$2`,
    )
    .replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${canonical}$2`,
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    )
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    )
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );

  if (dropFaqSchema) {
    // FAQ schema só faz sentido na LP — remove nas páginas legais.
    out = out.replace(
      /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>\s*/,
      "",
    );
  }
  return out;
}

let generated = 0;
for (const route of ROUTES) {
  const canonical = `${SITE}/${route.slug}`;
  const out = patch(baseHtml, { ...route, canonical });
  const dir = path.join(DIST, route.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), out, "utf8");
  generated++;
  console.log(`✓ dist/${route.slug}/index.html`);
}

console.log(`\nSEO build OK — ${generated} páginas geradas com meta tags próprias.`);
