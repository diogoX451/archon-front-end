import { LegalPageLayout, Section } from "./LegalPageLayout";

export function TermsPage() {
  return (
    <LegalPageLayout
      title="Termos de Uso"
      subtitle="Condições para uso da plataforma Archon."
      lastUpdated="15 de maio de 2026"
    >
      <Section title="1. Aceite">
        <p>
          Ao criar uma conta e utilizar a plataforma Archon, o usuário declara ter lido e
          concordar com estes Termos e com a Política de Privacidade. O uso continuado
          implica aceitação das versões vigentes destes documentos.
        </p>
      </Section>

      <Section title="2. Definições">
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li><strong>Plataforma:</strong> o software Archon, fornecido pela Almexa.</li>
          <li><strong>Cliente / tenant:</strong> pessoa jurídica que contrata o serviço.</li>
          <li><strong>Administrador:</strong> pessoa física autorizada pelo cliente a acessar o painel.</li>
          <li><strong>Usuário final:</strong> pessoa que interage com o cliente por meio dos canais integrados.</li>
        </ul>
      </Section>

      <Section title="3. Cadastro e segurança da conta">
        <p>
          O administrador é responsável pela veracidade dos dados cadastrais e pela
          confidencialidade das credenciais. Recomenda-se senha forte e exclusiva. Em
          caso de comprometimento, redefinir a senha imediatamente e comunicar o suporte.
        </p>
      </Section>

      <Section title="4. Uso permitido">
        <p>
          A plataforma deve ser usada para fins lícitos. É proibido:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>Enviar conteúdo que viole direitos de terceiros ou a legislação aplicável.</li>
          <li>Tentar contornar mecanismos de segurança, autenticação ou rate-limit.</li>
          <li>Submeter dados pessoais de terceiros sem base legal apropriada.</li>
          <li>Utilizar o serviço para envio de spam, fraude ou engenharia social.</li>
        </ul>
      </Section>

      <Section title="5. Conteúdo do cliente">
        <p>
          O cliente mantém a titularidade do conteúdo enviado à plataforma (documentos RAG,
          mensagens, configurações). A Almexa armazena e processa esse conteúdo
          exclusivamente para executar as funções contratadas.
        </p>
      </Section>

      <Section title="6. Uso de modelos de linguagem (LLM)">
        <p>
          As respostas geradas por modelos de linguagem podem conter imprecisões. O cliente
          é responsável pela revisão antes de utilizá-las em decisões que afetem terceiros.
          A Almexa não garante exatidão factual das saídas dos modelos.
        </p>
      </Section>

      <Section title="7. Disponibilidade e suporte">
        <p>
          A Almexa busca máxima disponibilidade, mas o serviço pode sofrer manutenções
          programadas ou indisponibilidades pontuais. SLA específico, se aplicável, é
          definido em contrato à parte.
        </p>
      </Section>

      <Section title="8. Limitação de responsabilidade">
        <p>
          A Almexa não responde por danos indiretos, lucros cessantes ou perda de dados
          decorrentes de uso indevido da plataforma pelo cliente, falhas em sistemas de
          terceiros (provedor de LLM, canais de mensageria) ou caso fortuito.
        </p>
      </Section>

      <Section title="9. Encerramento">
        <p>
          Tanto o cliente quanto a Almexa podem encerrar o contrato a qualquer tempo,
          mediante aviso prévio. Em caso de violação grave destes Termos, a Almexa poderá
          suspender o acesso imediatamente. Após o encerramento, os dados serão tratados
          conforme a política de retenção.
        </p>
      </Section>

      <Section title="10. Foro e lei aplicável">
        <p>
          Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de
          [a definir] para dirimir controvérsias, com renúncia a qualquer outro.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
