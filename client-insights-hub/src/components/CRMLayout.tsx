import { ReactNode } from "react";
import { CRMSidebar } from "./CRMSidebar";

interface CRMLayoutProps {
  children: ReactNode;
  activePage: string;
}

export function CRMLayout({ children, activePage }: CRMLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CRMSidebar activePage={activePage} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
