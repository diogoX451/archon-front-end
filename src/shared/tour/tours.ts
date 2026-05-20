import type { Step } from "react-joyride";
import type { TourId } from "./TourContext";

export type NavStepDef = {
  target: string;
  placement: Step["placement"];
  titleKey: string;
  contentKey: string;
  /** Permissions required for this step's target to exist in the DOM. */
  perms?: string[];
  /** If true, only super admins see this step. */
  superOnly?: boolean;
};

/** Nav tour steps with permission metadata so we never point at a DOM
 *  element that the current user's Rail doesn't render. */
export const navStepDefs: NavStepDef[] = [
  {
    target: ".rail-nav",
    placement: "right",
    titleKey: "tour.nav.steps.rail_overview.title",
    contentKey: "tour.nav.steps.rail_overview.content",
  },
  {
    target: "[data-tour='nav-workflows']",
    placement: "right",
    titleKey: "tour.nav.steps.rail_workflows.title",
    contentKey: "tour.nav.steps.rail_workflows.content",
    perms: ["workflow_list"],
  },
  {
    target: "[data-tour='nav-agents']",
    placement: "right",
    titleKey: "tour.nav.steps.rail_agents.title",
    contentKey: "tour.nav.steps.rail_agents.content",
    perms: ["conversation_profile_list"],
  },
  {
    target: "[data-tour='nav-events']",
    placement: "right",
    titleKey: "tour.nav.steps.rail_events.title",
    contentKey: "tour.nav.steps.rail_events.content",
    perms: ["workflow_list"],
  },
  {
    target: "[data-tour='nav-rag']",
    placement: "right",
    titleKey: "tour.nav.steps.rail_rag.title",
    contentKey: "tour.nav.steps.rail_rag.content",
    perms: ["rag_read", "rag_query", "rag_ingest"],
  },
  {
    target: ".rail-avatar",
    placement: "right",
    titleKey: "tour.nav.steps.rail_avatar.title",
    contentKey: "tour.nav.steps.rail_avatar.content",
  },
  {
    // Final CTA: send user to the builder to create their first agent.
    target: "[data-tour='nav-workflows']",
    placement: "right",
    titleKey: "tour.nav.steps.cta.title",
    contentKey: "tour.nav.steps.cta.content",
    perms: ["workflow_list"],
  },
];

export type TourDefinition = {
  steps: Step[];
};

export const tourDefinitions: Record<TourId, TourDefinition> = {
  // Nav steps are generated dynamically in TourOrchestrator — see navStepDefs.
  nav: { steps: [] },

  rag: {
    steps: [
      // 1 — Stats panel
      {
        target: "[data-tour='rag-stats']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.rag.steps.stats.title",
        content: "tour.rag.steps.stats.content",
      },
      // 2 — Create KB button
      {
        target: "[data-tour='rag-create-btn']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.rag.steps.create_btn.title",
        content: "tour.rag.steps.create_btn.content",
      },
      // 3 — KB card list
      {
        target: "[data-tour='rag-kb-list']",
        placement: "top",
        skipBeacon: true,
        title: "tour.rag.steps.kb_list.title",
        content: "tour.rag.steps.kb_list.content",
      },
      // 4 — Documents section (persistent wrapper — empty until a KB is selected)
      {
        target: "[data-tour='rag-docs-section']",
        placement: "top",
        skipBeacon: true,
        title: "tour.rag.steps.docs_section.title",
        content: "tour.rag.steps.docs_section.content",
      },
    ],
  },

  "workflow-builder": {
    steps: [
      // 1 — Overview do builder
      {
        target: "[data-tour='builder-canvas']",
        placement: "center",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.overview.title",
        content: "tour.workflowBuilder.steps.overview.content",
      },
      // 2 — Paleta geral
      {
        target: "[data-tour='builder-palette']",
        placement: "right",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.palette.title",
        content: "tour.workflowBuilder.steps.palette.content",
      },
      // 3 — Item Planner especificamente
      {
        target: "[data-tour='builder-palette-planner']",
        placement: "right",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.planner.title",
        content: "tour.workflowBuilder.steps.planner.content",
      },
      // 4 — Canvas (onde soltar o nó)
      {
        target: "[data-tour='builder-canvas']",
        placement: "center",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.canvas.title",
        content: "tour.workflowBuilder.steps.canvas.content",
      },
      // 5 — Inspector (configurar o nó)
      {
        target: "[data-tour='builder-inspector']",
        placement: "left",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.inspector.title",
        content: "tour.workflowBuilder.steps.inspector.content",
      },
      // 6 — Nome e ID do agente
      {
        target: "[data-tour='builder-name-input']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.nameInput.title",
        content: "tour.workflowBuilder.steps.nameInput.content",
      },
      // 7 — Botão Salvar
      {
        target: "[data-tour='builder-save-btn']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.save.title",
        content: "tour.workflowBuilder.steps.save.content",
      },
      // 8 — Botão Simular
      {
        target: "[data-tour='builder-simulate-btn']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.simulate.title",
        content: "tour.workflowBuilder.steps.simulate.content",
      },
    ],
  },
};
