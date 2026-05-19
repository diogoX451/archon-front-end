import { useEffect, useRef } from "react";
import { useAuth } from "@app/auth-context";
import { useTour } from "./TourContext";
import type { TourId } from "./TourContext";

/**
 * Automatically starts a tour the first time the user accesses a page.
 * A small delay lets React flush the DOM so Joyride can find the targets.
 */
export function useTourAutoStart(tourId: TourId, delayMs = 600) {
  const { user, loading } = useAuth();
  const { isDone, startTour } = useTour();
  const triggered = useRef(false);

  useEffect(() => {
    // Wait for auth to resolve and user to be present.
    if (loading || !user) return;
    // isDone() reads from localStorage — only fire if tour was never shown.
    if (triggered.current || isDone(tourId)) return;

    triggered.current = true;
    const timer = window.setTimeout(() => {
      startTour(tourId);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [loading, user, tourId, delayMs, isDone, startTour]);
}
