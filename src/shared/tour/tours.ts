import type { Step } from "react-joyride";
import type { TourId } from "./TourContext";

export type NavStepDef = {
  target: string;
  placement: Step["placement"];
  titleKey: string;
  contentKey: string;
  /** Permissions required for this step's target to exist in the DOM.
   *  If the user lacks ALL of them, the step is skipped. */
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
    // No perms — .rail-nav is always present for authenticated users.
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
    // No perms — avatar is always present.
  },
];

export type TourDefinition = {
  steps: Step[];
};

export const tourDefinitions: Record<TourId, TourDefinition> = {
  // Nav steps are generated dynamically in TourOrchestrator — see navStepDefs.
  nav: { steps: [] },

  "workflow-builder": {
    steps: [
      {
        target: "[data-tour='builder-palette']",
        placement: "right",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.palette.title",
        content: "tour.workflowBuilder.steps.palette.content",
      },
      {
        target: "[data-tour='builder-canvas']",
        placement: "top",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.canvas.title",
        content: "tour.workflowBuilder.steps.canvas.content",
      },
      {
        target: "[data-tour='builder-inspector']",
        placement: "left",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.inspector.title",
        content: "tour.workflowBuilder.steps.inspector.content",
      },
      {
        target: "[data-tour='builder-toolbar']",
        placement: "bottom",
        skipBeacon: true,
        title: "tour.workflowBuilder.steps.toolbar.title",
        content: "tour.workflowBuilder.steps.toolbar.content",
      },
    ],
  },
};
