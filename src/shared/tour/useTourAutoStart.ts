import { useEffect } from "react";
import { useAuth } from "@app/auth-context";
import { useTour } from "./TourContext";
import type { TourId } from "./TourContext";

/**
 * Automatically starts a tour the first time the user accesses a page.
 *
 * Design notes:
 * - No `triggered` ref: React 18 StrictMode preserves ref values across
 *   the simulated unmount/remount cycle, so a ref-based guard blocks the
 *   timer on the second (real) mount and the tour never fires.
 * - `activeTour !== null` guard: prevents re-triggering while any tour
 *   is already running (e.g. user navigates away and back mid-tour).
 * - `isDone` guard: reads localStorage — tour only fires once per user.
 */
export function useTourAutoStart(tourId: TourId, delayMs = 600) {
  const { user, loading } = useAuth();
  const { activeTour, isDone, startTour } = useTour();

  useEffect(() => {
    if (loading || !user) return;
    if (activeTour !== null) return;
    if (isDone(tourId)) return;

    const timer = window.setTimeout(() => startTour(tourId), delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, user, tourId, delayMs, activeTour, isDone, startTour]);
}
