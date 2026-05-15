import { LegalPageLayout, Section } from "./LegalPageLayout";

export function DpoPage() {
  return (
    <LegalPageLayout
      title="Encarregado pelo Tratamento (DPO)"
      subtitle="Canal direto para exercer seus direitos como titular de dados."
      lastUpdated="15 de maio de 2026"
    >
      <Section title="Como nos contatar">
        <p>
          Em conformidade com o art. 41 da LGPD, a Almexa mantém um encarregado pelo
          tratamento de dados (DPO) responsável por receber comunicações dos titulares e
          da Autoridade Nacional de Proteção de Dados.
        </p>
        <p>
          <strong>E-mail:</strong>{" "}
          <a href="mailto:info@almexa.com.br" style={{ color: "var(--ink)" }}>info@almexa.com.br</a>
        </p>
        <p>
          <strong>Nome do encarregado:</strong> Diogo Almeida.
        </p>
      </Section>

      <Section title="O que pedir ao DPO">
        <p>
          O canal acima pode ser usado para:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Solicitar confirmação ou cópia dos seus dados pessoais.</li>
          <li>Pedir correção, anonimização, bloqueio ou eliminação.</li>
          <li>Solicitar portabilidade dos dados.</li>
          <li>Revogar consentimento.</li>
          <li>Reclamar de tratamento que considere irregular.</li>
          <li>Tirar dúvidas sobre esta política.</li>
        </ul>
        <p>
          Usuários administradores autenticados podem exercer a maioria desses direitos
          diretamente no painel, em <strong>Minha Privacidade</strong>.
        </p>
      </Section>

      <Section title="Prazo de resposta">
        <p>
          Solicitações são respondidas em até 15 dias corridos a partir do recebimento,
          conforme o entendimento da ANPD. Solicitações complexas podem demandar prazo
          adicional, que será comunicado por escrito.
        </p>
      </Section>

      <Section title="Reclamações junto à ANPD">
        <p>
          Caso não tenha sua solicitação atendida ou discorde da resposta, o titular pode
          apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) pelo
          portal <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>gov.br/anpd</a>.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
