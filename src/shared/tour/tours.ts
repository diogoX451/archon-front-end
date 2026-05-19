import type { Step } from "react-joyride";
import type { TourId } from "./TourContext";

export type TourDefinition = {
  steps: Step[];
};

export const tourDefinitions: Record<TourId, TourDefinition> = {
  nav: {
    steps: [
      {
        target: ".rail-nav",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_overview.title",
        content: "tour.nav.steps.rail_overview.content",
      },
      {
        target: "[data-tour='nav-workflows']",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_workflows.title",
        content: "tour.nav.steps.rail_workflows.content",
      },
      {
        target: "[data-tour='nav-agents']",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_agents.title",
        content: "tour.nav.steps.rail_agents.content",
      },
      {
        target: "[data-tour='nav-events']",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_events.title",
        content: "tour.nav.steps.rail_events.content",
      },
      {
        target: "[data-tour='nav-rag']",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_rag.title",
        content: "tour.nav.steps.rail_rag.content",
      },
      {
        target: ".rail-avatar",
        placement: "right",
        skipBeacon: true,
        title: "tour.nav.steps.rail_avatar.title",
        content: "tour.nav.steps.rail_avatar.content",
      },
    ],
  },
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
