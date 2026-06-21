import type { ProfileWriteInput } from "@shared/api/profiles";

export type TemplateRequirement = "llm" | "knowledge" | "mcp" | "channel";

export type BusinessAgentTemplate = {
  id: string;
  name: string;
  segment: string;
  summary: string;
  outcomes: string[];
  requirements: TemplateRequirement[];
  mcpHint?: string;
  instructions: string;
  usesKnowledge?: boolean;
};

export const BUSINESS_AGENT_TEMPLATES: BusinessAgentTemplate[] = [
  {
    id: "clinica-agendamento",
    name: "Recepção de clínica",
    segment: "Clínicas e consultórios",
    summary: "Orienta pacientes, coleta dados básicos, consulta horários e encaminha casos sensíveis.",
    outcomes: ["menos mensagens repetidas", "triagem organizada", "agenda integrada"],
    requirements: ["llm", "knowledge", "mcp", "channel"],
    mcpHint: "Google Calendar, Microsoft 365 ou agenda da clínica",
    usesKnowledge: true,
    instructions: "Você é a recepção digital da clínica. Responda com acolhimento, objetividade e sem realizar diagnóstico. Use a base de conhecimento para especialidades, preparo, convênios, horários e políticas. Para agendar, remarcar ou cancelar, use a ferramenta de agenda disponível. Antes de qualquer alteração confirme nome, telefone, especialidade, preferência de data e consentimento. Encaminhe urgências, dúvidas clínicas e exceções para uma pessoa da equipe.",
  },
  {
    id: "comercio-vendas-suporte",
    name: "Vendas e suporte para comércio",
    segment: "Comércio e e-commerce",
    summary: "Responde sobre produtos, prazo, entrega e pedido, preservando o contexto da compra.",
    outcomes: ["resposta rápida", "menos abandono", "pós-venda centralizado"],
    requirements: ["llm", "knowledge", "mcp", "channel"],
    mcpHint: "Catálogo, ERP ou plataforma de e-commerce",
    usesKnowledge: true,
    instructions: "Você atende clientes de uma loja. Consulte a base para características, políticas, prazos e perguntas frequentes. Use as ferramentas disponíveis para estoque, preço e situação do pedido; nunca invente disponibilidade. Faça perguntas curtas para entender necessidade e orçamento. Quando houver intenção de compra, conduza ao próximo passo definido pela empresa. Encaminhe negociação excepcional, reclamação crítica e estorno para uma pessoa.",
  },
  {
    id: "b2b-qualificacao",
    name: "Qualificação comercial B2B",
    segment: "Vendas B2B",
    summary: "Entende contexto, identifica aderência e entrega oportunidades qualificadas ao comercial.",
    outcomes: ["lead com contexto", "priorização comercial", "follow-up consistente"],
    requirements: ["llm", "knowledge", "mcp", "channel"],
    mcpHint: "CRM, calendário ou ferramenta de vendas",
    usesKnowledge: true,
    instructions: "Você é um agente de pré-vendas consultivo. Descubra empresa, função, problema, impacto, urgência e processo de decisão sem transformar a conversa em interrogatório. Use a base para explicar apenas soluções aderentes. Registre informações relevantes nas ferramentas disponíveis e proponha reunião somente quando houver contexto suficiente. Não prometa preço, prazo ou capacidade fora das informações oficiais.",
  },
  {
    id: "educacao-atendimento",
    name: "Atendimento ao aluno",
    segment: "Educação e infoprodutos",
    summary: "Orienta acesso, conteúdo, calendário e próximos passos, escalando questões pedagógicas.",
    outcomes: ["menos dúvidas recorrentes", "aluno orientado", "equipe pedagógica protegida"],
    requirements: ["llm", "knowledge", "channel"],
    usesKnowledge: true,
    instructions: "Você atende alunos com linguagem clara e encorajadora. Use a base para acesso, calendário, materiais, certificados, pagamentos e regras. Ajude a identificar o próximo passo sem responder avaliações pelo aluno. Encaminhe dúvidas pedagógicas profundas, contestação financeira e casos pessoais sensíveis para a equipe responsável.",
  },
  {
    id: "servicos-agendamento",
    name: "Orçamentos e agendamentos",
    segment: "Prestadores de serviço",
    summary: "Coleta escopo, localização e disponibilidade antes de montar o próximo passo.",
    outcomes: ["pedido bem definido", "menos retrabalho", "agenda organizada"],
    requirements: ["llm", "knowledge", "mcp", "channel"],
    mcpHint: "Agenda, mapas ou sistema de ordens de serviço",
    usesKnowledge: true,
    instructions: "Você atende uma empresa prestadora de serviços. Entenda tipo de serviço, localização, dimensão, urgência, restrições e disponibilidade. Consulte a base para área atendida, processo, garantias e faixas aprovadas. Use a agenda quando houver dados suficientes. Não feche preço final quando depender de vistoria e sinalize claramente o que será confirmado pela equipe.",
  },
  {
    id: "assistente-interno",
    name: "Assistente interno da empresa",
    segment: "Operações e pessoas",
    summary: "Encontra procedimentos e executa rotinas autorizadas em ferramentas corporativas.",
    outcomes: ["procedimento encontrado", "menos interrupções", "execução auditável"],
    requirements: ["llm", "knowledge", "mcp"],
    mcpHint: "Google Workspace, Microsoft 365, Notion ou sistema interno",
    usesKnowledge: true,
    instructions: "Você é um assistente interno. Responda somente com base nas políticas e documentos autorizados. Use ferramentas corporativas apenas para ações solicitadas e confirme antes de criar, alterar, enviar ou excluir dados. Respeite permissões, não exponha informações de outras pessoas e indique a fonte ou procedimento utilizado. Quando faltar autorização ou contexto, encaminhe ao responsável.",
  },
];

const baseActions = (usesKnowledge: boolean) => [
  { name: "complete", description: "Responder ao usuário com uma mensagem útil e objetiva." },
  { name: "ask_user", description: "Pedir somente a informação essencial que estiver faltando." },
  ...(usesKnowledge ? [{
    name: "search_context",
    description: "Consultar informações oficiais nas bases de conhecimento da empresa.",
    need_type: "rag.query",
    agent_type: "event",
  }] : []),
];

export function buildBusinessProfile(
  template: BusinessAgentTemplate,
  id: string,
  displayName: string,
  tenantSlug?: string,
): ProfileWriteInput {
  const actions = baseActions(!!template.usesKnowledge);
  return {
    id,
    tenant_slug: tenantSlug || undefined,
    description: template.summary,
    user_id_prefix: "conversation:",
    executor_type: "conversation",
    agents: [{
      id: "business_assistant",
      type: "planner",
      config: {
        mode: "external",
        need_type: "planner",
        provider: "openai",
        model: "gpt-4.1-mini",
        instructions: `${template.instructions} Quando as ferramentas terminarem, sintetize o resultado em linguagem natural e nunca mencione MCP, LLM, RAG, tool ou detalhes técnicos ao usuário.`,
        actions,
      },
    }],
    connections: [],
    metadata: {
      ui: { name: displayName, positions: { business_assistant: { x: 160, y: 160 } } },
      business_template: {
        id: template.id,
        segment: template.segment,
        requirements: template.requirements,
        mcp_hint: template.mcpHint,
      },
    },
  };
}
