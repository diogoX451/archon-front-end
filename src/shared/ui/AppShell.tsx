import type { PropsWithChildren } from "react";
import { Rail } from "./Rail";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <>
      <Rail />
      <div className="page">
        {children}
      </div>
    </>
  );
}
