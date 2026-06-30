import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent, PropsWithChildren } from "react";
import { useDocumentMeta } from "@shared/hooks/useDocumentMeta";
import { Menu, X } from "lucide-react";
import { SIGNUP_ENABLED } from "@shared/signup-config";
import { ChatWidget } from "@shared/ui/ChatWidget";

const WHATSAPP_URL =
  "https://wa.me/5562999722708?text=Ol%C3%A1%21%20Quero%20conhecer%20o%20Archon.";

declare global {
  interface Window {
    gtag_report_conversion?: (url?: string) => boolean;
  }
}


const SECTION_LINKS = [
  { id: "beneficios", label: "Benefícios" },
  { id: "como", label: "Como funciona" },
  { id: "plataforma", label: "Plataforma" },
  { id: "casos", label: "Pra quem é" },
  { id: "faq", label: "Dúvidas" },
];

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  event.preventDefault();
  navigateToSection(section, sectionId);
}

function navigateToSection(section: HTMLElement, sectionId: string) {
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `#${sectionId}`);
}

function reportWhatsAppConversion(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();

  const url = event.currentTarget.href;
  if (typeof window.gtag_report_conversion === "function") {
    window.gtag_report_conversion(url);
    return;
  }

  window.location.href = url;
}

export function LandingPage() {
  useDocumentMeta({
    title: "Archon — Agente personalizado para todos os canais | Almexa",
    description:
      "Um agente personalizado que atende clientes no WhatsApp, site e outros canais, centraliza conversas e trabalha no tom da sua empresa.",
    canonical: "https://archon.almexa.com.br/",
  });
  return (
    <div id="landing-page" style={page}>
      <style>{css}</style>
      <Header />
      <Hero />
      <Marquee />
      <Benefits />
      <HowItWorks />
      <PlatformShowcase />
      <CaseStudy />
      <UseCases />
      <Comparison />
      <Faq />
      <FinalCta />
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  const handleSectionClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    scrollToSection(event, sectionId);
    setOpen(false);
  };

  const links = (
    <>
      {SECTION_LINKS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          style={navLink}
          onClick={(event) => handleSectionClick(event, item.id)}
        >
          {item.label}
        </a>
      ))}
      <Link to="/login" style={navLink} onClick={() => setOpen(false)}>Entrar</Link>
      {SIGNUP_ENABLED && <Link to="/signup" style={navLink} onClick={() => setOpen(false)}>Criar conta</Link>}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        style={ctaSmall}
        onClick={(event) => {
          setOpen(false);
          reportWhatsAppConversion(event);
        }}
      >
        WhatsApp →
      </a>
    </>
  );

  const mobileMenuOverlay = (
    <div className="lp-nav-mobile" style={mobileMenu} id="lp-mobile-menu" role="dialog" aria-modal="true">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <Link to="/" style={brand} onClick={() => setOpen(false)}>
          <span style={brandDot} />
          Almexa <span style={brandDim}>· Archon</span>
        </Link>
        <button type="button" onClick={() => setOpen(false)} style={burger} aria-label="Fechar menu">
          <X size={26} />
        </button>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SECTION_LINKS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={mobileNavLink}
            onClick={(event) => handleSectionClick(event, item.id)}
          >
            {item.label}
          </a>
        ))}
        <Link to="/login" style={{ ...mobileNavLink, marginTop: 8 }} onClick={() => setOpen(false)}>
          Entrar
        </Link>
        {SIGNUP_ENABLED && (
          <Link to="/signup" style={mobileNavLink} onClick={() => setOpen(false)}>
            Criar conta
          </Link>
        )}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          style={{ ...ctaSmall, marginTop: 16, textAlign: "center", display: "block" }}
          onClick={(event) => {
            setOpen(false);
            reportWhatsAppConversion(event);
          }}
        >
          Falar no WhatsApp →
        </a>
      </nav>
    </div>
  );

  return (
    <>
      <header style={header}>
        <div style={headerInner}>
          <Link to="/" style={brand}>
            <span style={brandDot} />
            Almexa <span style={brandDim}>· Archon</span>
          </Link>

          {/* Desktop nav */}
          <nav className="lp-nav-desktop" style={nav}>
            {links}
          </nav>

          {/* Hamburger button — visible only on mobile */}
          <button
            type="button"
            className="lp-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="lp-mobile-menu"
            style={burger}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </header>
      {open ? createPortal(mobileMenuOverlay, document.body) : null}
    </>
  );
}

function Hero() {
  return (
    <section style={hero}>
      <div style={heroBg} aria-hidden />
      <div style={heroInner}>
        <div className="lp-hero-left" style={heroLeft}>
          <span style={pill}>
            <span style={pillPulse} /> Orquestrador de agentes
          </span>
          <h1 style={h1}>
            Agentes que executam o seu processo em <em style={emAccent}>todos os canais.</em>
          </h1>
          <p style={lead}>
            O Archon orquestra agentes que conversam, decidem e acionam o que seu negócio precisa.
            Eles aprendem as suas regras, respondem com rapidez e chamam sua equipe quando precisa de uma pessoa.
          </p>
          <div style={ctaRow}>
            {SIGNUP_ENABLED ? (
              <Link to="/signup" style={ctaPrimary}>
                Criar conta grátis →
              </Link>
            ) : (
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                style={ctaPrimary}
                onClick={reportWhatsAppConversion}
              >
                Quero ver funcionando →
              </a>
            )}
            <a href="#como" style={ctaGhost} onClick={(event) => scrollToSection(event, "como")}>Como funciona</a>
          </div>
          <div style={miniProof}>
            <span style={miniDot} />
            <span>Não é um chatbot pronto · é uma orquestração configurada para o seu negócio</span>
          </div>
        </div>
        <div className="lp-hero-right" style={heroRight} aria-hidden>
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}

function ChatPreview() {
  return (
    <div style={chatCard}>
      <div style={chatHeader}>
        <div style={chatAvatar}>A</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Atendimento</div>
          <div style={{ fontSize: 12, color: "var(--ok)" }}>● online · agora</div>
        </div>
      </div>
      <div style={chatBody}>
        <Bubble side="them" delay={0}>Vocês entregam no meu bairro?</Bubble>
        <Bubble side="us" delay={0.4}>Entregamos sim 🚚 Quer retirada ou no endereço?</Bubble>
        <Bubble side="them" delay={0.9}>No endereço.</Bubble>
        <Bubble side="us" delay={1.3}>Em média 40 min. Posso adiantar seu pedido? 🙂</Bubble>
        <Typing delay={1.9} />
      </div>
    </div>
  );
}

function Bubble({ side, delay, children }: PropsWithChildren<{ side: "us" | "them"; delay: number }>) {
  const us = side === "us";
  return (
    <div
      style={{
        alignSelf: us ? "flex-end" : "flex-start",
        background: us ? "var(--accent-soft)" : "var(--surface)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        borderBottomRightRadius: us ? 4 : 14,
        borderBottomLeftRadius: us ? 14 : 4,
        padding: "9px 13px",
        maxWidth: "82%",
        fontSize: 14,
        lineHeight: 1.45,
        boxShadow: "var(--shadow-1)",
        animation: `bubbleIn 0.5s ${delay}s both ease-out`,
      }}
    >
      {children}
    </div>
  );
}

function Typing({ delay }: { delay: number }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        borderBottomLeftRadius: 4,
        padding: "10px 14px",
        animation: `bubbleIn 0.5s ${delay}s both ease-out`,
        display: "flex",
        gap: 4,
      }}
      aria-label="digitando"
    >
      <Dot i={0} /><Dot i={1} /><Dot i={2} />
    </div>
  );
}
function Dot({ i }: { i: number }) {
  return (
    <span
      style={{
        width: 6, height: 6, borderRadius: 999,
        background: "var(--ink-4)", display: "inline-block",
        animation: `dotPulse 1.2s ${i * 0.18}s infinite ease-in-out`,
      }}
    />
  );
}

function Marquee() {
  const phrases = [
    "Responde sem deixar o cliente esperando", "Atende 24 horas", "Centraliza os canais",
    "Segue o tom da empresa", "Escala para sua equipe", "Evolui com a operação",
  ];
  return (
    <section style={marqueeWrap}>
      <div style={marqueeTrack}>
        {[...phrases, ...phrases, ...phrases].map((p, i) => (
          <span key={i} style={marqueeItem}>
            <span style={marqueeDot} />{p}
          </span>
        ))}
      </div>
    </section>
  );
}

const BENEFITS = [
  { n: "01", title: "Responde clientes com rapidez", body: "O atendimento continua à noite, no almoço e nos feriados, sem deixar mensagens acumularem." },
  { n: "02", title: "Mantém uma experiência consistente", body: "O agente segue o tom, as regras e as informações da sua empresa em cada conversa." },
  { n: "03", title: "Reduz erros e tarefas repetitivas", body: "Sua equipe deixa de repetir respostas e atua nos casos que exigem decisão humana." },
  { n: "04", title: "Centraliza todos os canais", body: "WhatsApp, site e novas integrações trabalham com o mesmo contexto de atendimento." },
  { n: "05", title: "Começa sem projeto interminável", body: "A configuração parte do seu processo atual e evolui conforme a operação aprende." },
  { n: "06", title: "Conta com acompanhamento próximo", body: "A Almexa configura, monitora e ajusta o agente junto com a sua equipe." },
];

function Benefits() {
  return (
    <section id="beneficios" className="lp-section" style={section}>
      <div style={sectionInner}>
        <Eyebrow>O que muda</Eyebrow>
        <h2 style={h2}>
          Atendimento que <em style={emAccent}>trabalha por você</em> {"—"} sem drama.
        </h2>
        <p style={sub}>Resultados operacionais claros, sem exigir que sua equipe entenda de IA.</p>
        <div className="lp-grid3" style={grid3}>
          {BENEFITS.map((b) => (
            <article key={b.n} style={benefitCard}>
              <span style={benefitN}>{b.n}</span>
              <h3 style={cardTitle}>{b.title}</h3>
              <p style={cardBody}>{b.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Bate-papo", body: "15 minutos pra entender seu negócio." },
  { n: "02", title: "A gente monta", body: "Você só revisa o tom e o que pode falar." },
  { n: "03", title: "Vai pro ar", body: "Conectado, atendendo, monitorado." },
  { n: "04", title: "Evolui junto", body: "Cresce com o seu negócio, sem refazer." },
];

function HowItWorks() {
  return (
    <section id="como" className="lp-section" style={sectionAlt}>
      <div style={sectionInner}>
        <Eyebrow>Em quatro passos</Eyebrow>
        <h2 style={h2}>Da primeira conversa ao primeiro cliente atendido.</h2>
        <div className="lp-steps" style={stepsLine}>
          {STEPS.map((s, i) => (
            <div key={s.n} className="lp-step" style={stepWrap}>
              <div style={stepHead}>
                <span style={stepBadge}>{s.n}</span>
                {i < STEPS.length - 1 && <span className="lp-step-connector" style={stepLine} />}
              </div>
              <h3 style={{ ...cardTitle, marginTop: 14 }}>{s.title}</h3>
              <p style={cardBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformShowcase() {
  return (
    <section id="plataforma" className="lp-section" style={section}>
      <div style={sectionInner}>
        <Eyebrow>Por dentro da plataforma</Eyebrow>
        <h2 style={h2}>A operação inteira visível, sem transformar sua equipe em especialista técnico.</h2>
        <p style={sub}>Acompanhe conversas, contatos e atendimentos. Para começar um novo caso, escolha um cenário pronto e conecte apenas o que ele precisa.</p>
        <div className="lp-product-grid" style={productGrid}>
          <figure style={productFigure}>
            <div style={productImageFrame}>
              <img src="/product/painel-visao-geral.png" alt="Painel do Archon com indicadores de conversas, contatos, clientes e atendimentos" loading="lazy" style={productImage} />
            </div>
            <figcaption style={productCaption}>
              <strong>Painel operacional</strong>
              <span>Conversas, clientes e atendimentos reunidos em uma única visão.</span>
            </figcaption>
          </figure>
          <figure style={productFigure}>
            <div style={productImageFrame}>
              <img src="/product/cenarios-prontos.png" alt="Catálogo de cenários prontos do Archon para clínicas, comércio e vendas B2B" loading="lazy" style={productImage} />
            </div>
            <figcaption style={productCaption}>
              <strong>Cenários prontos por negócio</strong>
              <span>Escolha o processo, revise as regras e conecte as dependências indicadas.</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

const USES = [
  { tag: "Clínicas e consultórios", title: "Para equipes enxutas que precisam orientar, agendar, confirmar e encaminhar pacientes." },
  { tag: "Comércio e serviços", title: "Para operações que respondem dúvidas sobre produtos, prazos, pedidos e disponibilidade." },
  { tag: "Educação e infoprodutos", title: "Para atender alunos, orientar próximos passos e organizar demandas recorrentes." },
  { tag: "Vendas B2B", title: "Para qualificar oportunidades e entregar ao comercial conversas com contexto." },
];

const CASE_STEPS = ["Áudio da ligação", "Transcrição", "Classificação de risco", "Revisão humana"];

function CaseStudy() {
  return (
    <section id="caso-real" className="lp-section" style={sectionAlt}>
      <div style={sectionInner}>
        <Eyebrow>Caso real</Eyebrow>
        <h2 style={h2}>
          O mesmo motor que atende também <em style={emAccent}>vigia risco em ligações.</em>
        </h2>
        <p style={sub}>
          Uma clínica subiu, no motor do Archon, um agente que ouve ligações e sinaliza risco — com revisão humana.
          Mesmo orquestrador, outro processo.
        </p>

        <div style={casePipeline}>
          {CASE_STEPS.map((label, i) => (
            <Fragment key={label}>
              <div style={caseStep}>{label}</div>
              {i < CASE_STEPS.length - 1 && <span style={caseArrow} aria-hidden>→</span>}
            </Fragment>
          ))}
        </div>

        <div style={caseResult}>
          <span style={caseResultLabel}>Resultado do agente</span>
          <span style={caseBadge}>Classificação: Fuga</span>
          <span style={{ ...caseBadge, borderColor: "var(--accent)" }}>Nível: ALTO</span>
          <span style={caseResultHint}>classificada em segundos, com revisão humana</span>
        </div>

        <div style={caseAgentsRow}>
          <span style={{ color: "var(--ink-3)", fontSize: 15 }}>Mesmo orquestrador:</span>
          <span style={useTag}>Agente de atendimento</span>
          <span style={useTag}>Agente de risco</span>
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="casos" className="lp-section" style={section}>
      <div style={sectionInner}>
        <Eyebrow>Pra quem é</Eyebrow>
        <h2 style={h2}>Feito para empresas pequenas e médias que precisam atender melhor sem ampliar o operacional.</h2>
        <p style={sub}>A experiência é configurada para cada segmento; sua equipe usa o processo do negócio, não termos como LLM ou MCP.</p>
        <div className="lp-grid2" style={grid2}>
          {USES.map((u) => (
            <article key={u.tag} style={useCard}>
              <span style={useTag}>{u.tag}</span>
              <p style={{ ...cardBody, fontSize: 17, color: "var(--ink)" }}>{u.title}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison() {
  const before = [
    "Mensagem das 23h sem resposta",
    "Time repetindo as mesmas dúvidas",
    "Cliente espera e desiste",
    "Você é o gargalo",
  ];
  const after = [
    "Atendido na hora, sempre",
    "Equipe focada no que importa",
    "Resposta no seu tom, sem ruído",
    "Atendimento não para",
  ];
  return (
    <section className="lp-section" style={sectionAlt}>
      <div style={sectionInner}>
        <Eyebrow>Antes e depois</Eyebrow>
        <h2 style={h2}>
          Sai de <em style={emMuted}>conversas espalhadas</em> para{" "}
          <em style={emAccent}>atendimento coordenado.</em>
        </h2>
        <div className="lp-grid2" style={grid2}>
          <article style={compareBefore}>
            <h3 style={compareTitle}>Hoje</h3>
            <ul style={ul}>
              {before.map((b) => (
                <li key={b} style={liMuted}><span style={dash}>{"—"}</span> {b}</li>
              ))}
            </ul>
          </article>
          <article style={compareAfter}>
            <h3 style={{ ...compareTitle, color: "var(--accent-ink)" }}>Com o Archon</h3>
            <ul style={ul}>
              {after.map((a) => (
                <li key={a} style={liStrong}><span style={check}>✓</span> {a}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Preciso entender de tecnologia?", a: "Não. A gente cuida da parte técnica. Você só fala como atende." },
  { q: "Funciona no meu WhatsApp atual?", a: "Sim. Pode usar o seu número ou um novo — a gente orienta a melhor opção." },
  { q: "Em quanto tempo fica pronto?", a: "Poucos dias depois da primeira conversa." },
  { q: "E se ele não souber responder?", a: "Passa pra um humano do seu time, sem deixar o cliente no vácuo." },
  { q: "Quanto custa?", a: "Depende do tamanho. Chama no WhatsApp pra um orçamento rápido." },
];

function Faq() {
  return (
    <section id="faq" className="lp-section" style={section}>
      <div style={{ ...sectionInner, maxWidth: 820 }}>
        <Eyebrow>Dúvidas frequentes</Eyebrow>
        <h2 style={h2}>Vai com tudo. A gente já respondeu isso aqui.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
          {FAQS.map((f) => (
            <details key={f.q} style={faqItem}>
              <summary style={faqSummary}>
                <span>{f.q}</span>
                <span className="faq-plus" style={faqPlus}>+</span>
              </summary>
              <p style={faqAnswer}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section style={ctaSection}>
      <div style={ctaBg} aria-hidden />
      <div style={{ ...sectionInner, textAlign: "center", maxWidth: 720, position: "relative" }}>
        <span style={{ ...pill, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }}>
          15 minutos é tudo que precisa
        </span>
        <h2 style={ctaH2}>
          Pronto pra parar de perder <em style={emAccentLight}>mensagem?</em>
        </h2>
        <p style={ctaSub}>
          Uma conversa rápida resolve. Se fizer sentido pro seu negócio, a gente toca.
        </p>
        <div style={{ ...ctaRow, justifyContent: "center", marginTop: 28 }}>
          {SIGNUP_ENABLED && (
            <Link to="/signup" style={ctaPrimaryLight}>
              Criar conta agora →
            </Link>
          )}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            style={SIGNUP_ENABLED ? ctaGhostLight : ctaPrimaryLight}
            onClick={reportWhatsAppConversion}
          >
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={footer}>
      <div style={footerInner}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={brandDot} /> Almexa <span style={brandDim}>· Archon</span>
          </strong>
          <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
            Atendimento que trabalha por você.
          </span>
        </div>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14 }}>
          <Link to="/privacy" style={navLink}>Privacidade</Link>
          <Link to="/terms" style={navLink}>Termos</Link>
          <Link to="/dpo" style={navLink}>DPO</Link>
          <Link to="/login" style={navLink}>Entrar</Link>
          {SIGNUP_ENABLED && <Link to="/signup" style={navLink}>Criar conta</Link>}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={navLink} onClick={reportWhatsAppConversion}>WhatsApp</a>
        </nav>
      </div>
      <div style={footerBottom}>© {new Date().getFullYear()} Almexa LTDA · CNPJ 48.803.245/0001-83 · Curitiba/PR</div>
    </footer>
  );
}

function Eyebrow({ children }: PropsWithChildren) {
  return (
    <div style={eyebrow}>
      <span style={eyebrowBar} />
      {children}
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const css = `
/* The app shell locks #root because authenticated screens manage their own
   scrolling. The public landing page must use #root as its scroll viewport so
   native touch/wheel scrolling keeps working after anchor navigation. */
#root { overflow-x: hidden; overflow-y: auto; }

/* Anchor targets must clear the 68px sticky header, otherwise clicking a nav
   tab scrolls the section title behind the header and looks broken. */
.lp-section { scroll-margin-top: 80px; }
@keyframes bubbleIn {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
@keyframes dotPulse {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
@keyframes pulseDot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.55); }
  50%      { box-shadow: 0 0 0 6px rgba(72, 187, 120, 0); }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-33.333%); }
}
@keyframes menuFade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.lp-nav-mobile {
  animation: menuFade 0.2s ease-out forwards;
}
details[open] summary .faq-plus { transform: rotate(45deg); }
.faq-plus { transition: transform .2s ease; }

/* Desktop: hide burger, show nav */
@media (min-width: 768px) {
  .lp-burger { display: none !important; }
  .lp-nav-mobile { display: none !important; }
}

/* Mobile: hide desktop nav, show burger */
@media (max-width: 767px) {
  .lp-nav-desktop { display: none !important; }
  .lp-burger { display: flex !important; }

  /* Hero: hide chat preview, full-width text */
  .lp-hero-right { display: none !important; }
  .lp-hero-left { flex: 1 1 100% !important; max-width: 100% !important; }

  /* Sections: less vertical padding */
  .lp-section { padding: 56px 20px !important; }

  /* Steps: single column, hide horizontal connector */
  .lp-steps { grid-template-columns: 1fr !important; gap: 32px !important; }
  .lp-step-connector { display: none !important; }

  /* Grids: single column below 520px */
  .lp-grid2 { grid-template-columns: 1fr !important; }
  .lp-grid3 { grid-template-columns: 1fr !important; }
  .lp-product-grid { grid-template-columns: 1fr !important; }
}
`;

const page: CSSProperties = { minHeight: "100vh", width: "100%", background: "var(--bg)", color: "var(--ink)" };
const header: CSSProperties = { position: "sticky", top: 0, zIndex: 20, background: "color-mix(in oklab, var(--bg) 85%, transparent)", backdropFilter: "saturate(140%) blur(10px)", borderBottom: "1px solid var(--line)" };
const headerInner: CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 };
const brand: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 10, color: "var(--ink)", textDecoration: "none", fontWeight: 600, letterSpacing: "-0.01em" };
const brandDim: CSSProperties = { color: "var(--ink-3)", fontWeight: 500 };
const brandDot: CSSProperties = { width: 10, height: 10, borderRadius: 999, background: "var(--accent)", display: "inline-block", boxShadow: "0 0 0 3px var(--accent-soft)" };
const nav: CSSProperties = { display: "flex", alignItems: "center", gap: 18 };
const navLink: CSSProperties = { color: "var(--ink-2)", textDecoration: "none", fontSize: 14 };
const ctaSmall: CSSProperties = { background: "var(--ink)", color: "var(--surface)", padding: "9px 16px", borderRadius: 999, textDecoration: "none", fontSize: 14, fontWeight: 500 };
const burger: CSSProperties = { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 8px", marginRight: -8, borderRadius: 6 };
const mobileMenu: CSSProperties = { position: "fixed", inset: 0, zIndex: 1100, background: "var(--bg)", padding: "20px 24px 32px", overflowY: "auto", overscrollBehavior: "contain" };
const mobileNavLink: CSSProperties = { display: "block", color: "var(--ink)", textDecoration: "none", fontSize: 20, fontWeight: 500, padding: "14px 0", borderBottom: "1px solid var(--line)" };

const hero: CSSProperties = { position: "relative", padding: "88px 24px 64px", overflow: "hidden" };
const heroBg: CSSProperties = { position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 85% 15%, var(--accent-soft) 0%, transparent 60%), radial-gradient(50% 40% at 10% 95%, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 };
const heroInner: CSSProperties = { position: "relative", maxWidth: 1200, margin: "0 auto", display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap", zIndex: 1 };
const heroLeft: CSSProperties = { flex: "1 1 520px", maxWidth: 680 };
const heroRight: CSSProperties = { flex: "1 1 340px", display: "flex", justifyContent: "center" };
const pill: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 12px 6px 10px", background: "var(--accent-soft)", color: "var(--accent-ink)", borderRadius: 999, marginBottom: 22, fontWeight: 500 };
const pillPulse: CSSProperties = { width: 8, height: 8, borderRadius: 999, background: "var(--ok)", display: "inline-block", animation: "pulseDot 1.6s infinite" };
const h1: CSSProperties = { fontSize: "clamp(36px, 5.4vw, 64px)", lineHeight: 1.05, letterSpacing: "-0.035em", fontWeight: 600, margin: "0 0 22px" };
const emAccent: CSSProperties = { color: "var(--accent-ink)", fontStyle: "normal" };
const emAccentLight: CSSProperties = { color: "var(--accent-soft)", fontStyle: "normal" };
const emMuted: CSSProperties = { color: "var(--ink-3)", fontStyle: "normal" };
const lead: CSSProperties = { fontSize: 18, lineHeight: 1.55, color: "var(--ink-2)", margin: "0 0 32px", maxWidth: 560 };
const ctaRow: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" };
const ctaPrimary: CSSProperties = { background: "var(--ink)", color: "var(--surface)", padding: "17px 32px", borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", display: "inline-block", letterSpacing: "-0.01em" };
const ctaPrimaryLight: CSSProperties = { background: "var(--surface)", color: "var(--ink)", padding: "17px 32px", borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 18, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "inline-block", letterSpacing: "-0.01em" };
const ctaGhost: CSSProperties = { background: "transparent", color: "var(--ink-2)", padding: "17px 20px", borderRadius: 999, textDecoration: "none", fontWeight: 500, fontSize: 17, border: "1.5px solid var(--line-strong, #d0d0d0)", display: "inline-block" };
const ctaGhostLight: CSSProperties = { background: "transparent", color: "rgba(255,255,255,0.9)", padding: "17px 24px", borderRadius: 999, textDecoration: "none", fontWeight: 500, fontSize: 17, border: "1.5px solid rgba(255,255,255,0.4)", display: "inline-block" };
const miniProof: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 10, marginTop: 28, color: "var(--ink-3)", fontSize: 14 };
const miniDot: CSSProperties = { width: 6, height: 6, borderRadius: 999, background: "var(--accent)", display: "inline-block" };

const chatCard: CSSProperties = { width: "100%", maxWidth: 380, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 22, boxShadow: "var(--shadow-3)", overflow: "hidden", transform: "rotate(-1deg)" };
const chatHeader: CSSProperties = { padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, background: "var(--surface)" };
const chatAvatar: CSSProperties = { width: 38, height: 38, borderRadius: 999, background: "linear-gradient(135deg, var(--accent), var(--accent-ink))", color: "white", display: "grid", placeItems: "center", fontWeight: 600 };
const chatBody: CSSProperties = { padding: 18, display: "flex", flexDirection: "column", gap: 10, minHeight: 280 };

const marqueeWrap: CSSProperties = { borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface)", overflow: "hidden", padding: "16px 0" };
const marqueeTrack: CSSProperties = { display: "flex", gap: 36, whiteSpace: "nowrap", animation: "marquee 30s linear infinite" };
const marqueeItem: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 10, color: "var(--ink-2)", fontSize: 15, fontWeight: 500 };
const marqueeDot: CSSProperties = { width: 5, height: 5, borderRadius: 999, background: "var(--accent)" };

const section: CSSProperties = { padding: "88px 24px", borderTop: "1px solid var(--line)" };
const sectionAlt: CSSProperties = { ...section, background: "var(--surface)" };
const sectionInner: CSSProperties = { maxWidth: 1200, margin: "0 auto" };
const eyebrow: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent-ink)", marginBottom: 14 };
const eyebrowBar: CSSProperties = { width: 24, height: 1, background: "var(--accent)", display: "inline-block" };
const h2: CSSProperties = { fontSize: "clamp(26px, 3.6vw, 46px)", letterSpacing: "-0.025em", fontWeight: 600, margin: "0 0 12px", lineHeight: 1.1, maxWidth: 820 };
const sub: CSSProperties = { color: "var(--ink-3)", fontSize: 17, margin: "0 0 32px" };

const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 24 };
const grid3: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 28 };
const productGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18, marginTop: 30 };
const productFigure: CSSProperties = { margin: 0, padding: 10, borderRadius: 18, border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow-2)" };
const productImageFrame: CSSProperties = { height: 330, overflow: "hidden", borderRadius: 12, border: "1px solid var(--line)", background: "var(--bg)" };
const productImage: CSSProperties = { display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" };
const productCaption: CSSProperties = { display: "flex", flexDirection: "column", gap: 5, padding: "14px 8px 8px", color: "var(--ink-2)", fontSize: 13, lineHeight: 1.45 };

const cardTitle: CSSProperties = { margin: "0 0 8px", fontSize: 18, fontWeight: 600 };
const cardBody: CSSProperties = { margin: 0, color: "var(--ink-2)", fontSize: 15, lineHeight: 1.55 };

const benefitCard: CSSProperties = { position: "relative", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "26px 22px 22px", boxShadow: "var(--shadow-1)" };
const benefitN: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent-ink)", letterSpacing: "0.05em", display: "block", marginBottom: 12 };

const stepsLine: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginTop: 32 };
const stepWrap: CSSProperties = { position: "relative" };
const stepHead: CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const stepBadge: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--surface)", background: "var(--ink)", padding: "5px 10px", borderRadius: 999, flexShrink: 0 };
const stepLine: CSSProperties = { flex: 1, height: 1, background: "linear-gradient(90deg, var(--line-strong), color-mix(in oklab, var(--accent) 35%, transparent))" };

const useCard: CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 22px 24px", boxShadow: "var(--shadow-1)" };
const useTag: CSSProperties = { display: "inline-block", fontSize: 12, fontWeight: 600, color: "var(--accent-ink)", background: "var(--accent-soft)", padding: "4px 10px", borderRadius: 999, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" };

const casePipeline: CSSProperties = { display: "flex", alignItems: "stretch", flexWrap: "wrap", gap: 10, marginTop: 8 };
const caseStep: CSSProperties = { flex: "1 1 160px", minWidth: 0, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 14px", fontSize: 15, fontWeight: 600, color: "var(--ink)", textAlign: "center", boxShadow: "var(--shadow-1)" };
const caseArrow: CSSProperties = { display: "flex", alignItems: "center", color: "var(--ink-4)", fontSize: 18 };
const caseResult: CSSProperties = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 18, padding: "14px 16px", background: "var(--accent-soft)", borderRadius: 12 };
const caseResultLabel: CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--accent-ink)" };
const caseBadge: CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--line-strong)", padding: "4px 12px", borderRadius: 999 };
const caseResultHint: CSSProperties = { fontSize: 13, color: "var(--ink-3)", marginLeft: "auto" };
const caseAgentsRow: CSSProperties = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 18 };

const compareBefore: CSSProperties = { background: "var(--surface-2)", border: "1px dashed var(--line-strong)", borderRadius: 16, padding: 26 };
const compareAfter: CSSProperties = { background: "linear-gradient(180deg, var(--accent-soft), color-mix(in oklab, var(--accent-soft) 60%, var(--surface)))", border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)", borderRadius: 16, padding: 26 };
const compareTitle: CSSProperties = { margin: "0 0 14px", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)" };
const ul: CSSProperties = { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 };
const liStrong: CSSProperties = { color: "var(--ink)", fontSize: 16, display: "flex", gap: 10, alignItems: "flex-start" };
const liMuted: CSSProperties = { color: "var(--ink-3)", fontSize: 16, display: "flex", gap: 10, alignItems: "flex-start", textDecoration: "line-through", textDecorationColor: "var(--line-2)" };
const dash: CSSProperties = { color: "var(--ink-4)" };
const check: CSSProperties = { color: "var(--accent-ink)", fontWeight: 700 };

const faqItem: CSSProperties = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 20px" };
const faqSummary: CSSProperties = { cursor: "pointer", fontWeight: 600, fontSize: 16, listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 };
const faqPlus: CSSProperties = { fontSize: 22, color: "var(--accent-ink)", lineHeight: 1, flexShrink: 0 };
const faqAnswer: CSSProperties = { margin: "12px 0 0", color: "var(--ink-2)", fontSize: 15, lineHeight: 1.6 };

const ctaSection: CSSProperties = { position: "relative", padding: "96px 24px", background: "var(--ink)", color: "var(--surface)", borderTop: "1px solid var(--line)", overflow: "hidden" };
const ctaBg: CSSProperties = { position: "absolute", inset: 0, background: "radial-gradient(50% 60% at 50% 0%, color-mix(in oklab, var(--accent) 35%, transparent) 0%, transparent 70%)", pointerEvents: "none" };
const ctaH2: CSSProperties = { fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.025em", fontWeight: 600, margin: "12px 0 14px", lineHeight: 1.05 };
const ctaSub: CSSProperties = { color: "color-mix(in oklab, white 75%, transparent)", fontSize: 18, margin: 0 };

const footer: CSSProperties = { borderTop: "1px solid var(--line)", background: "var(--surface)", padding: "32px 24px 28px" };
const footerInner: CSSProperties = { maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" };
const footerBottom: CSSProperties = { maxWidth: 1200, margin: "20px auto 0", color: "var(--ink-3)", fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 16 };
