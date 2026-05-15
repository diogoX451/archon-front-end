import { LegalPageLayout, Section } from "./LegalPageLayout";

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Política de Privacidade"
      subtitle="Como a Almexa trata seus dados pessoais no produto Archon."
      lastUpdated="15 de maio de 2026"
    >
      <Section title="1. Quem é o controlador">
        <p>
          A Almexa LTDA, sediada em Curitiba/PR e inscrita no CNPJ sob o nº
          48.803.245/0001-83, é a controladora dos dados pessoais dos administradores
          cadastrados na plataforma Archon (almexa.com.br). Quando o cliente (tenant)
          utiliza a plataforma para se comunicar com seus próprios usuários finais, o
          cliente é o controlador desses dados e a Almexa atua como operadora, na forma
          do art. 5º da LGPD.
        </p>
      </Section>

      <Section title="2. Quais dados tratamos">
        <p>
          Coletamos apenas o necessário para entregar o serviço:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Nome e e-mail do usuário administrador.</li>
          <li>Senha (armazenada em hash bcrypt — nunca em texto claro).</li>
          <li>Razão social, slug e, opcionalmente, documento (CNPJ ou CPF) do tenant.</li>
          <li>
            Conteúdo das conversas processadas pelos modelos de linguagem e pelos canais
            integrados (WhatsApp, webhooks etc.).
          </li>
          <li>Documentos enviados para a base de conhecimento (RAG).</li>
          <li>
            Metadados de uso: endereço IP, agente do navegador, ações executadas no painel
            (registro de auditoria).
          </li>
        </ul>
      </Section>

      <Section title="3. Bases legais (art. 7º da LGPD)">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li><strong>Execução de contrato (art. 7º, V):</strong> autenticação, provisão do serviço, integrações.</li>
          <li><strong>Legítimo interesse (art. 7º, IX):</strong> registro de auditoria, segurança da informação.</li>
          <li><strong>Cumprimento de obrigação legal (art. 7º, II):</strong> retenção mínima exigida por lei.</li>
        </ul>
        <p>
          Não realizamos tratamento para fins de marketing sem consentimento explícito do
          titular.
        </p>
      </Section>

      <Section title="4. Compartilhamento com terceiros">
        <p>
          Para entregar o serviço, compartilhamos dados estritamente necessários com:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>
            <strong>OpenAI e Google (Gemini):</strong> conteúdo das mensagens enviadas aos
            modelos de linguagem. Operam fora do Brasil (EUA / multi-região), sob cláusulas
            contratuais padrão de proteção de dados. O treinamento do modelo com seus dados
            está desativado nas contas que utilizamos.
          </li>
          <li>
            <strong>DigitalOcean:</strong> provedor de hospedagem responsável pelo
            processamento e armazenamento dos dados em ambiente isolado.
          </li>
          <li>
            <strong>Let's Encrypt:</strong> apenas o endereço de e-mail operacional, para fins
            de certificado TLS.
          </li>
        </ul>
        <p>
          Não vendemos nem cedemos seus dados pessoais a terceiros para finalidades
          publicitárias.
        </p>
      </Section>

      <Section title="5. Transferência internacional">
        <p>
          OpenAI e Google operam infraestrutura fora do Brasil. A transferência ocorre com
          base em cláusulas contratuais padrão, conforme art. 33, II, da LGPD.
        </p>
      </Section>

      <Section title="6. Retenção">
        <p>
          Mantemos seus dados pelo tempo necessário às finalidades descritas:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Conta ativa: enquanto durar o contrato.</li>
          <li>Conta excluída: 30 dias de carência para reativação, depois eliminação física.</li>
          <li>Registro de auditoria: até 5 anos, para fins de segurança.</li>
          <li>Conteúdo de conversas: política configurável por tenant (90 a 365 dias).</li>
        </ul>
      </Section>

      <Section title="7. Seus direitos (art. 18 da LGPD)">
        <p>
          Como titular, você pode, a qualquer tempo, exercer os direitos abaixo diretamente
          no painel autenticado em <strong>Minha Privacidade</strong>:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Acesso aos dados que mantemos sobre você.</li>
          <li>Correção de dados incompletos ou inexatos.</li>
          <li>Portabilidade — exportação em formato legível.</li>
          <li>Eliminação dos seus dados pessoais.</li>
          <li>Informação sobre compartilhamento com terceiros.</li>
          <li>Revogação de consentimento, quando aplicável.</li>
        </ul>
        <p>
          Pedidos por escrito podem ser endereçados ao encarregado em{" "}
          <a href="mailto:info@almexa.com.br" style={{ color: "var(--ink)" }}>info@almexa.com.br</a>.
        </p>
      </Section>

      <Section title="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais alinhadas ao art. 46 da LGPD: TLS 1.2+
          em todo o tráfego, criptografia AES-256-GCM para credenciais e chaves de API em
          repouso, controle de acesso por perfil (RBAC), auditoria das ações administrativas
          e revisão periódica do código por terceiros.
        </p>
      </Section>

      <Section title="9. Incidentes">
        <p>
          Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos
          titulares, comunicaremos a Autoridade Nacional de Proteção de Dados (ANPD) e os
          titulares afetados em prazo razoável, conforme art. 48 da LGPD.
        </p>
      </Section>

      <Section title="10. Alterações desta política">
        <p>
          Esta política pode ser atualizada para refletir mudanças no serviço ou na
          legislação. Versões anteriores ficam disponíveis sob solicitação ao DPO. Mudanças
          materiais serão comunicadas por e-mail aos administradores cadastrados com pelo
          menos 15 dias de antecedência.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
