import { useEffect } from "react";
import { Joyride, STATUS } from "react-joyride";
import type { EventData, Controls, Step } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useAuth } from "@app/auth-context";
import { canAny } from "@shared/authz";
import { useTour } from "./TourContext";
import { tourDefinitions, navStepDefs } from "./tours";

/** Builds nav tour steps filtered to the links actually visible for this user. */
function useNavSteps(t: (k: string) => string): Step[] {
  const { isSuper, hasPermission } = useAuth();

  return navStepDefs
    .filter((def) => {
      if (def.superOnly && !isSuper) return false;
      if (!def.perms || def.perms.length === 0) return true;
      return canAny({ isSuper, hasPermission }, def.perms);
    })
    .map((def) => ({
      target: def.target,
      placement: def.placement,
      skipBeacon: true,
      title: t(def.titleKey),
      content: t(def.contentKey),
    }));
}

export function TourOrchestrator() {
  const { t } = useTranslation();
  const { activeTour, endTour } = useTour();
  const navSteps = useNavSteps(t);

  const steps: Step[] =
    activeTour === "nav"
      ? navSteps
      : activeTour
      ? tourDefinitions[activeTour].steps.map((step) => ({
          ...step,
          title: t(step.title as string),
          content: t(step.content as string),
        }))
      : [];

  // Edge case: tour active but no visible steps (user without permissions).
  // Call endTour in an effect to avoid state update during render.
  useEffect(() => {
    if (activeTour && steps.length === 0) {
      endTour();
    }
  }, [activeTour, steps.length, endTour]);

  if (!activeTour || steps.length === 0) return null;

  const localeKey = activeTour === "nav" ? "tour.nav" : "tour.workflowBuilder";

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
