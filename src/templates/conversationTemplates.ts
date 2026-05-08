export const templates = {
  requestedEvent: {
    event_id: "evt-template-001",
    workflow_id: "wf-template-001",
    profile_id: "archon-assistant",
    conversation_id: "wa_556299722708",
    tenant_id: "produzindo_certo",
    message: "Quais projetos vocês oferecem além do Reg.IA?",
    history: [],
    channel_context: {
      channel: "whatsapp",
      recipient: "556299722708",
      contact_id: 556299722708,
      session_id: 20260506,
      message_id: 20260506012
    }
  },
  turnRequest: {
    profile_id: "archon-assistant",
    conversation_id: "wa_556299722708",
    message: "Me traga um resumo da Produzindo Certo com foco em projetos.",
    history: [],
    facts: { canal: "frontend" }
  },
  ragQuery: {
    tenant_id: "produzindo_certo",
    query: "projetos Produzindo Certo",
    top_k: 5
  }
};
