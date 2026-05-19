import type { PropsWithChildren } from "react";
import { Rail } from "./Rail";
import { TourOrchestrator, useTourAutoStart } from "@shared/tour";

function NavTourGate() {
  useTourAutoStart("nav", 800);
  return null;
}

export function AppShell({ children }: PropsWithChildren) {
  return (
    <>
      <NavTourGate />
      <Rail />
      <div className="page">
        {children}
      </div>
      <TourOrchestrator />
    </>
  );
}
