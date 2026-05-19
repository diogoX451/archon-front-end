import { Joyride, STATUS } from "react-joyride";
import type { EventData, Controls } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useTour } from "./TourContext";
import { tourDefinitions } from "./tours";

export function TourOrchestrator() {
  const { t } = useTranslation();
  const { activeTour, endTour } = useTour();

  if (!activeTour) return null;

  const definition = tourDefinitions[activeTour];
  const localeKey = activeTour === "nav" ? "tour.nav" : "tour.workflowBuilder";

  const steps = definition.steps.map((step) => ({
    ...step,
    title: t(step.title as string),
    content: t(step.content as string),
  }));

  function handleEvent(data: EventData, _controls: Controls) {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      endTour({ skipped: status === STATUS.SKIPPED });
    }
  }

  return (
    <Joyride
      steps={steps}
      run={true}
      continuous
      scrollToFirstStep
      locale={{
        skip: t(`${localeKey}.skip`),
        back: t(`${localeKey}.back`),
        next: t(`${localeKey}.next`),
        last: t(`${localeKey}.finish`),
      }}
      onEvent={handleEvent}
      options={{
        primaryColor: "#3b6fd4",
        backgroundColor: "#ffffff",
        textColor: "#1a1a1a",
        arrowColor: "#ffffff",
        overlayColor: "rgba(0, 0, 0, 0.45)",
        zIndex: 9000,
        showProgress: true,
        buttons: ["back", "close", "primary", "skip"],
        overlayClickAction: false,
      }}
    />
  );
}
